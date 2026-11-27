import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { exerciseStates, parseTemplateRef, validateTemplate, type TemplateFiles } from '@typika/manifest'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { beforeAll, describe, expect, it } from 'vitest'

import { parseGoListJson, type GoListPackage, type StdPackages } from '../src/domain/go-list.domain-model.ts'
import { makeGoCommand } from '../src/go-command-shim/go-command-shim.ts'
import { listStdPackages, wasmGoEnv } from '../src/node/std-packages.ts'

const TEMPLATES = join(import.meta.dirname, '../../../templates')

const GOPLS_LIST = [
  'list',
  '-e',
  '-json=Name,ImportPath,Error,Dir,GoFiles,IgnoredGoFiles,IgnoredOtherFiles,CFiles,CgoFiles,CXXFiles,MFiles,HFiles,FFiles,SFiles,SwigFiles,SwigCXXFiles,SysoFiles,TestGoFiles,XTestGoFiles,CompiledGoFiles,Export,DepOnly,Imports,ImportMap,TestImports,XTestImports,ForTest,DepsErrors,Module,EmbedFiles',
  '-compiled=true',
  '-test=true',
  '-export=false',
  '-deps=true',
  '-find=false',
  '-pgo=off',
  '--',
]

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  )

const readTree = (root: string): Map<string, string> =>
  new Map(walk(root).map((path) => [relative(root, path), readFileSync(path, 'utf8')]))

const textFiles = (files: TemplateFiles) =>
  new Map(
    [...files].map(([path, content]) => [
      path,
      typeof content === 'string' ? content : new TextDecoder().decode(content),
    ])
  )

const inTempModule = <A>(files: ReadonlyMap<string, string>, use: (dir: string) => A): A => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'typika-go-list-')))
  try {
    for (const [path, content] of files) {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), content)
    }
    return use(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const isTestMain = (pkg: GoListPackage) => pkg.Name === 'main' && pkg.ImportPath.endsWith('.test')

const withoutTestMains = (packages: ReadonlyArray<GoListPackage>) => {
  const byPath = new Map(packages.map((pkg) => [pkg.ImportPath, pkg]))
  const reached = new Set<string>()
  const visit = (importPath: string) => {
    if (reached.has(importPath)) return
    reached.add(importPath)
    for (const dependency of byPath.get(importPath)?.Imports ?? []) visit(dependency)
  }
  for (const pkg of packages) if (pkg.DepOnly !== true && !isTestMain(pkg)) visit(pkg.ImportPath)
  return packages.filter((pkg) => reached.has(pkg.ImportPath))
}

const keyed = (packages: ReadonlyArray<GoListPackage>) =>
  Object.fromEntries(packages.map((pkg) => [pkg.ImportPath, pkg] as const).toSorted(([a], [b]) => a.localeCompare(b)))

describe('the go command shim against native go', () => {
  let std: StdPackages
  let goroot: string

  beforeAll(() => {
    std = listStdPackages()
    goroot = execFileSync('go', ['env', 'GOROOT'], { encoding: 'utf8' }).trim()
  })

  const expectSameList = (files: ReadonlyMap<string, string>, patterns: (root: string) => ReadonlyArray<string>) =>
    inTempModule(files, (root) => {
      const args = [...GOPLS_LIST, ...patterns(root)]
      const native = parseGoListJson(
        execFileSync('go', args, { cwd: root, env: wasmGoEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      )
      const go = makeGoCommand({ goroot, root, env: {}, std, files: () => files, readFile: () => undefined })

      const result = go(args, root, [])

      expect(result.code).toBe(0)
      expect(keyed(parseGoListJson(result.stdout))).toEqual(keyed(withoutTestMains(native)))
    })

  const goTemplates = readdirSync(TEMPLATES).filter((name) => existsSync(join(TEMPLATES, name, 'go')))

  describe.each(goTemplates)('on %s/go', (name) => {
    const template = textFiles(readTree(join(TEMPLATES, name, 'go')))

    it('lists the template like go list', () => {
      expectSameList(template, (root) => [`${root}/...`, 'builtin'])
    })

    it('lists the starting state and the solution of each exercise like go list', async () => {
      const { manifest } = await Effect.runPromise(validateTemplate(template))
      const ref =
        manifest.base === undefined ? undefined : Option.getOrUndefined(parseTemplateRef(manifest.base.template))
      const base = ref?.path === undefined ? undefined : textFiles(readTree(join(TEMPLATES, ref.path)))
      for (const exercise of manifest.exercises) {
        const states = await Effect.runPromise(exerciseStates({ template, base, exercise }))
        expectSameList(textFiles(states.start), (root) => [`${root}/...`, 'builtin'])
        expectSameList(textFiles(states.solution), (root) => [`${root}/...`, 'builtin'])
      }
    })
  })

  it('lists test variants, recompiled dependencies and broken imports like go list', () => {
    const files = new Map(
      Object.entries({
        'go.mod': 'module example.com/shop\n\ngo 1.24\n',
        'money/money.go': 'package money\n\nimport "fmt"\n\nfunc Format() string { return fmt.Sprint(1) }\n',
        'money/money_windows.go': 'package money\n',
        'money/money_test.go':
          'package money\n\nimport (\n\t"fmt"\n\t"testing"\n)\n\nfunc TestFormat(t *testing.T) { fmt.Sprint() }\n',
        'checkout/checkout.go': 'package checkout\n\nimport "example.com/shop/money"\n\nvar Total = money.Format\n',
        'checkout/checkout_internal_test.go':
          'package checkout\n\nimport "testing"\n\nfunc TestTotal(t *testing.T) {}\n',
        'checkout/checkout_test.go':
          'package checkout_test\n\nimport (\n\t"testing"\n\n\t"example.com/shop/report"\n)\n\nfunc TestReport(t *testing.T) { _ = report.X }\n',
        'report/report.go': 'package report\n\nimport "example.com/shop/checkout"\n\nvar X = checkout.Total\n',
        'cmd/shop/main.go': 'package main\n\nfunc main() {}\n',
        'cmd/shop/main_test.go': 'package main_test\n\nimport "testing"\n\nfunc TestRun(t *testing.T) {}\n',
        'tools/tools.go': '//go:build tools\n\npackage tools\n',
        'dec/dec.go': 'package dec\n\nimport "github.com/acme/decimal"\n\nvar X = decimal.X\n',
        'top/top.go':
          'package top\n\nimport (\n\t"foo/bar"\n\n\t"example.com/shop/dec"\n)\n\nvar _, _ = dec.X, bar.X\n',
        'testdata/skip.go': 'package skip\n',
      })
    )

    expectSameList(files, (root) => [`${root}/...`, 'builtin'])
    expectSameList(files, () => ['./tools', './checkout', 'example.com/shop/top', 'builtin'])
  })
})

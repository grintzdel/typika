import { describe, expect, it } from 'vitest'

import { parseGoListJson, type GoListPackage, type StdPackages } from '../domain/go-list.domain-model.ts'
import { makeGoCommand, type GoCommandContext } from './go-command-shim.ts'

const ROOT = '/work'
const GOROOT = '/goroot'

const std: StdPackages = new Map<string, GoListPackage>([
  ['errors', { Dir: 'src/errors', ImportPath: 'errors', Name: 'errors', GoFiles: ['errors.go'] }],
  ['fmt', { Dir: 'src/fmt', ImportPath: 'fmt', Name: 'fmt', GoFiles: ['print.go'], Imports: ['errors'] }],
  ['testing', { Dir: 'src/testing', ImportPath: 'testing', Name: 'testing', GoFiles: ['testing.go'] }],
  ['cmp', { Dir: 'src/cmp', ImportPath: 'cmp', Name: 'cmp', GoFiles: ['cmp.go'] }],
  [
    'builtin',
    { Dir: 'src/builtin', ImportPath: 'builtin', Name: 'builtin', GoFiles: ['builtin.go'], Imports: ['cmp'] },
  ],
])

const shop = (overrides: Readonly<Record<string, string>> = {}) =>
  new Map(
    Object.entries({
      'go.mod': 'module example.com/shop\n\ngo 1.24\n',
      'money/money.go': 'package money\n\nimport "fmt"\n\nfunc Format() string { return fmt.Sprint(1) }\n',
      'money/money_windows.go': 'package money\n',
      'money/money_test.go': 'package money\n\nimport "testing"\n\nfunc TestFormat(t *testing.T) {}\n',
      'checkout/checkout.go': 'package checkout\n\nimport "example.com/shop/money"\n\nvar _ = money.Format\n',
      'checkout/checkout_test.go':
        'package checkout_test\n\nimport (\n\t"testing"\n\n\t"example.com/shop/checkout"\n)\n\nfunc TestCheckout(t *testing.T) { _ = checkout.Total }\n',
      'README.md': '# shop\n',
      ...overrides,
    })
  )

const contextFor = (files = shop(), readFile: (path: string) => string | undefined = () => undefined) =>
  ({
    goroot: GOROOT,
    root: ROOT,
    env: { GOPATH: '/home/go', GOCACHE: '/home/.cache/go-build' },
    std,
    files: () => files,
    readFile,
  }) satisfies GoCommandContext

const LIST = [
  'list',
  '-e',
  '-json=Name,ImportPath,Error,Dir,GoFiles,IgnoredGoFiles,CompiledGoFiles,DepOnly,Imports,ImportMap,TestGoFiles,XTestGoFiles,ForTest,DepsErrors,Module',
  '-compiled=true',
  '-test=true',
  '-export=false',
  '-deps=true',
  '-find=false',
  '-pgo=off',
  '--',
]

const byPath = (packages: ReadonlyArray<GoListPackage>) => new Map(packages.map((pkg) => [pkg.ImportPath, pkg]))

const packages = () =>
  byPath(parseGoListJson(makeGoCommand(contextFor())([...LIST, `${ROOT}/...`, 'builtin'], ROOT, []).stdout))

describe('makeGoCommand', () => {
  it('answers go env -json with the requested variables only', () => {
    const go = makeGoCommand(contextFor())

    const result = go(['env', '-json', 'GOOS', 'GOARCH', 'GOROOT', 'GOPATH', 'GOFLAGS'], ROOT, [])

    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      GOOS: 'js',
      GOARCH: 'wasm',
      GOROOT,
      GOPATH: '/home/go',
      GOFLAGS: '',
    })
  })

  it('lets the invocation environment override go env', () => {
    const result = makeGoCommand(contextFor())(['env', '-json', 'GOFLAGS'], ROOT, ['GOFLAGS=-tags=x'])

    expect(JSON.parse(result.stdout)).toEqual({ GOFLAGS: '-tags=x' })
  })

  it('answers go version with the shipped release', () => {
    expect(makeGoCommand(contextFor())(['version'], ROOT, [])).toEqual({
      stdout: 'go version go1.24.5 js/wasm\n',
      stderr: '',
      code: 0,
    })
  })

  it('answers the release tags and the compiler queries gopls runs on unsafe', () => {
    const go = makeGoCommand(contextFor())

    expect(go(['list', '-e', '-f', '{{context.ReleaseTags}}', '--', 'unsafe'], ROOT, []).stdout).toBe(
      `[${Array.from({ length: 24 }, (_, index) => `go1.${index + 1}`).join(' ')}]\n`
    )
    expect(go(['list', '-f', '{{context.GOARCH}} {{context.Compiler}}', '--', 'unsafe'], ROOT, []).stdout).toBe(
      'wasm gc\n'
    )
  })

  it('succeeds on go mod tidy without touching anything', () => {
    expect(makeGoCommand(contextFor())(['mod', 'tidy', '-modfile=/tmp/x/go.mod'], ROOT, [])).toEqual({
      stdout: '',
      stderr: '',
      code: 0,
    })
  })

  it('fails with a clear error on a command it does not know', () => {
    const result = makeGoCommand(contextFor())(['build', './...'], ROOT, [])

    expect(result.code).toBe(1)
    expect(result.stderr).toBe('go build is not available in the browser\n')
  })

  describe('go list of the module', () => {
    it('lists each package of the module with its files, imports and module', () => {
      expect(packages().get('example.com/shop/money')).toEqual({
        Dir: `${ROOT}/money`,
        ImportPath: 'example.com/shop/money',
        Name: 'money',
        Module: { Path: 'example.com/shop', Main: true, Dir: ROOT, GoMod: `${ROOT}/go.mod`, GoVersion: '1.24' },
        GoFiles: ['money.go'],
        CompiledGoFiles: ['money.go'],
        IgnoredGoFiles: ['money_windows.go'],
        Imports: ['fmt'],
        TestGoFiles: ['money_test.go'],
      })
    })

    it('lists the standard dependencies as dependencies only, under GOROOT', () => {
      expect(packages().get('fmt')).toEqual({
        Dir: `${GOROOT}/src/fmt`,
        ImportPath: 'fmt',
        Name: 'fmt',
        DepOnly: true,
        GoFiles: ['print.go'],
        Imports: ['errors'],
      })
      expect(packages().get('errors')).toMatchObject({ DepOnly: true })
      expect(packages().get('builtin')).toMatchObject({ Dir: `${GOROOT}/src/builtin`, Imports: ['cmp'] })
      expect(packages().get('builtin')).not.toHaveProperty('DepOnly')
    })

    it('adds the internal and external test variants, without the test main', () => {
      const all = packages()

      expect(all.get('example.com/shop/money [example.com/shop/money.test]')).toMatchObject({
        Name: 'money',
        ForTest: 'example.com/shop/money',
        GoFiles: ['money.go', 'money_test.go'],
        CompiledGoFiles: ['money.go', 'money_test.go'],
        Imports: ['testing', 'fmt'],
      })
      expect(all.get('example.com/shop/checkout_test [example.com/shop/checkout.test]')).toMatchObject({
        Name: 'checkout_test',
        ForTest: 'example.com/shop/checkout',
        GoFiles: ['checkout_test.go'],
        Imports: ['example.com/shop/checkout', 'testing'],
      })
      expect([...all.keys()].filter((path) => path.endsWith('.test'))).toEqual([])
    })

    it('recompiles for the test the packages that import the package under test', () => {
      const go = makeGoCommand(
        contextFor(
          shop({
            'checkout/checkout_internal_test.go':
              'package checkout\n\nimport "testing"\n\nfunc TestTotal(t *testing.T) {}\n',
            'report/report.go': 'package report\n\nimport "example.com/shop/checkout"\n\nvar _ = checkout.Total\n',
            'checkout/checkout_test.go':
              'package checkout_test\n\nimport (\n\t"testing"\n\n\t"example.com/shop/report"\n)\n\nfunc TestReport(t *testing.T) { _ = report.X }\n',
          })
        )
      )
      const all = byPath(parseGoListJson(go([...LIST, `${ROOT}/...`], ROOT, []).stdout))

      expect(all.get('example.com/shop/checkout_test [example.com/shop/checkout.test]')).toMatchObject({
        Imports: ['example.com/shop/report [example.com/shop/checkout.test]', 'testing'],
        ImportMap: { 'example.com/shop/report': 'example.com/shop/report [example.com/shop/checkout.test]' },
      })
      expect(all.get('example.com/shop/report [example.com/shop/checkout.test]')).toMatchObject({
        Name: 'report',
        ForTest: 'example.com/shop/checkout',
        DepOnly: true,
        Imports: ['example.com/shop/checkout [example.com/shop/checkout.test]'],
        ImportMap: { 'example.com/shop/checkout': 'example.com/shop/checkout [example.com/shop/checkout.test]' },
      })
    })

    it('reports an import that is neither in the module nor in the shipped library', () => {
      const go = makeGoCommand(
        contextFor(shop({ 'money/money.go': 'package money\n\nimport "github.com/acme/decimal"\n' }))
      )
      const all = byPath(parseGoListJson(go([...LIST, `${ROOT}/...`], ROOT, []).stdout))

      const error = {
        ImportStack: ['example.com/shop/checkout', 'example.com/shop/money'],
        Pos: 'money/money.go:3:8',
        Err: 'no required module provides package github.com/acme/decimal; to add it:\n\tgo get github.com/acme/decimal',
      }
      expect(all.get('github.com/acme/decimal')).toEqual({
        ImportPath: 'github.com/acme/decimal',
        DepOnly: true,
        Error: error,
      })
      expect(all.get('example.com/shop/money')).toMatchObject({ DepsErrors: [error] })
    })

    it('reports a standard-looking import that Typika does not ship', () => {
      const go = makeGoCommand(contextFor(shop({ 'money/money.go': 'package money\n\nimport "net/http"\n' })))
      const all = byPath(parseGoListJson(go([...LIST, `${ROOT}/...`], ROOT, []).stdout))

      expect(all.get('net/http')?.Error?.Err).toBe(`package net/http is not in std (${GOROOT}/src/net/http)`)
    })

    it('skips a directory whose files are all excluded by build constraints', () => {
      const go = makeGoCommand(contextFor(shop({ 'tools/tools.go': '//go:build tools\n\npackage tools\n' })))

      expect(parseGoListJson(go([...LIST, `${ROOT}/...`], ROOT, []).stdout).map((pkg) => pkg.ImportPath)).not.toContain(
        'example.com/shop/tools'
      )
      expect(parseGoListJson(go([...LIST, './tools'], ROOT, []).stdout)).toEqual([
        expect.objectContaining({
          ImportPath: 'example.com/shop/tools',
          IgnoredGoFiles: ['tools.go'],
          Error: {
            ImportStack: ['example.com/shop/tools'],
            Pos: '',
            Err: `build constraints exclude all Go files in ${ROOT}/tools`,
          },
        }),
      ])
    })
  })

  it('lists the package of an absolute directory, and nothing it does not depend on', () => {
    const go = makeGoCommand(contextFor())

    const paths = parseGoListJson(go([...LIST, `${ROOT}/money`], ROOT, []).stdout).map((pkg) => pkg.ImportPath)

    expect(paths.toSorted()).toEqual([
      'errors',
      'example.com/shop/money',
      'example.com/shop/money [example.com/shop/money.test]',
      'fmt',
      'testing',
    ])
  })

  it('reports a directory that does not exist', () => {
    const [missing] = parseGoListJson(makeGoCommand(contextFor())([...LIST, './nope'], ROOT, []).stdout)

    expect(missing).toEqual({
      ImportPath: './nope',
      Error: { ImportStack: [], Pos: '', Err: `stat ${ROOT}/nope: directory not found` },
    })
  })

  it('lists packages by import path and relative pattern', () => {
    const go = makeGoCommand(contextFor())

    const roots = (pattern: string) =>
      parseGoListJson(go([...LIST, pattern], ROOT, []).stdout)
        .filter((pkg) => pkg.DepOnly !== true && pkg.ForTest === undefined)
        .map((pkg) => pkg.ImportPath)

    expect(roots('example.com/shop/checkout')).toEqual(['example.com/shop/checkout'])
    expect(roots('./money')).toEqual(['example.com/shop/money'])
    expect(roots('fmt')).toEqual(['fmt'])
  })

  it('reads the overlay gopls passes for unsaved files', () => {
    const overlay = {
      Replace: { [`${ROOT}/money/money.go`]: '/tmp/overlay/1.go', [`${ROOT}/money/money_test.go`]: '' },
    }
    const files: Readonly<Record<string, string>> = {
      '/tmp/overlay.json': JSON.stringify(overlay),
      '/tmp/overlay/1.go': 'package money\n\nimport "errors"\n',
    }
    const go = makeGoCommand(contextFor(shop(), (path) => files[path]))

    const money = byPath(
      parseGoListJson(go([...LIST.slice(0, -1), '-overlay=/tmp/overlay.json', '--', './money'], ROOT, []).stdout)
    ).get('example.com/shop/money')

    expect(money).toMatchObject({ Imports: ['errors'] })
    expect(money).not.toHaveProperty('TestGoFiles')
  })

  it('keeps only the fields that -json asks for', () => {
    const go = makeGoCommand(contextFor())

    const [money] = parseGoListJson(go(['list', '-e', '-json=ImportPath,GoFiles', '--', './money'], ROOT, []).stdout)

    expect(money).toEqual({ ImportPath: 'example.com/shop/money', GoFiles: ['money.go'] })
  })
})

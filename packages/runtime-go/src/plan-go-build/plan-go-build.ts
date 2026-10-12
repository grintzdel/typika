import type { Diagnostic } from '@typika/runtime-core'

import type { GoBuildPlan, GoFileImport, GoPackage, GoTest } from '../domain/go-package.domain-model.ts'
import { matchesBuildContext } from '../match-build-context/match-build-context.ts'
import { parseGoSource, type GoSource } from '../parse-go-source/parse-go-source.ts'

export type ProjectFiles = ReadonlyMap<string, string | Uint8Array>

type ParsedFile = { readonly path: string; readonly source: GoSource }

const decoder = new TextDecoder()

const textOf = (content: string | Uint8Array) => (typeof content === 'string' ? content : decoder.decode(content))

const dirOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))
const baseOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)

const error = (message: string, file?: string, line?: number, column?: number): Diagnostic =>
  file === undefined || line === undefined
    ? { severity: 'error', message }
    : { severity: 'error', message, location: { file, line, ...(column === undefined ? {} : { column }) } }

export const isImportableStd = (importPath: string, std: ReadonlySet<string>) =>
  std.has(importPath) && !importPath.split('/').includes('internal') && !importPath.startsWith('vendor/')

const isLocal = (importPath: string, modulePath: string) =>
  importPath === modulePath || importPath.startsWith(`${modulePath}/`)

const parseGoMod = (content: string) => ({
  path: /^\s*module\s+"?([^\s"]+)"?\s*$/m.exec(content)?.[1],
  language: /^\s*go\s+(\d+\.\d+)/m.exec(content)?.[1],
})

const isBuildable = (path: string, nestedModules: ReadonlyArray<string>) =>
  path.endsWith('.go') &&
  !path.split('/').some((segment) => segment.startsWith('.') || segment.startsWith('_') || segment === 'testdata') &&
  !nestedModules.some((dir) => path.startsWith(`${dir}/`))

const sourceFiles = (files: ProjectFiles) => {
  const nestedModules = [...files.keys()].filter((path) => path.endsWith('/go.mod')).map(dirOf)
  return [...files]
    .filter(([path]) => isBuildable(path, nestedModules))
    .toSorted(([a], [b]) => a.localeCompare(b))
    .flatMap(([path, content]): ReadonlyArray<ParsedFile> => {
      const source = parseGoSource(textOf(content))
      return source === undefined || !matchesBuildContext(baseOf(path), source.buildConstraint)
        ? []
        : [{ path, source }]
    })
}

const importsOf = (files: ReadonlyArray<ParsedFile>): ReadonlyArray<GoFileImport> =>
  files.flatMap(({ path, source }) => source.imports.map((entry) => ({ ...entry, file: path })))

const uniquePaths = (imports: ReadonlyArray<GoFileImport>) =>
  [...new Set(imports.map((entry) => entry.path))].toSorted()

const testsOf = (files: ReadonlyArray<ParsedFile>): ReadonlyArray<GoTest> =>
  files.flatMap(({ path, source }) => source.tests.map((name) => ({ name, file: path })))

const unavailableImport = (entry: GoFileImport, std: ReadonlySet<string>): Diagnostic =>
  error(
    entry.path === 'C'
      ? 'cgo is not available in the browser: "C" cannot be imported.'
      : std.has(entry.path) || !entry.path.split('/')[0]?.includes('.')
        ? `package ${entry.path} is not in the standard library that Typika ships for the browser.`
        : `package ${entry.path} is not available: Typika runs Go with the standard library only.`,
    entry.file,
    entry.position.line,
    entry.position.column
  )

export const findUnavailableImports = (files: ProjectFiles, std: ReadonlySet<string>): ReadonlyArray<Diagnostic> => {
  const modulePath = parseGoMod(textOf(files.get('go.mod') ?? '')).path ?? ''
  return importsOf(sourceFiles(files))
    .filter((entry) => !isImportableStd(entry.path, std) && !isLocal(entry.path, modulePath))
    .map((entry) => unavailableImport(entry, std))
}

const groupByDir = (files: ReadonlyArray<ParsedFile>) => {
  const dirs = new Map<string, Array<ParsedFile>>()
  for (const file of files) dirs.set(dirOf(file.path), [...(dirs.get(dirOf(file.path)) ?? []), file])
  return dirs
}

const makePackage = (
  modulePath: string,
  dir: string,
  files: ReadonlyArray<ParsedFile>
): GoPackage | { readonly conflict: Diagnostic } => {
  const isTest = (file: ParsedFile) => file.path.endsWith('_test.go')
  const goFiles = files.filter((file) => !isTest(file))
  const name =
    goFiles[0]?.source.packageName ??
    files.find((file) => !file.source.packageName.endsWith('_test'))?.source.packageName ??
    files[0]?.source.packageName.replace(/_test$/, '') ??
    ''
  const xtestFiles = files.filter((file) => isTest(file) && file.source.packageName === `${name}_test`)
  const testFiles = files.filter((file) => isTest(file) && !xtestFiles.includes(file))
  const stray = [...goFiles, ...testFiles].find((file) => file.source.packageName !== name)
  if (stray !== undefined) {
    const first = files.find((file) => file.source.packageName === name)
    return {
      conflict: error(
        `found packages ${name} (${baseOf(first?.path ?? '')}) and ${stray.source.packageName} (${baseOf(stray.path)}) in ${dir || '.'}`,
        stray.path,
        1,
        1
      ),
    }
  }
  const has = (selected: ReadonlyArray<ParsedFile>) => selected.some((file) => file.source.hasTestMain)
  return {
    importPath: dir === '' ? modulePath : `${modulePath}/${dir}`,
    dir,
    name,
    goFiles: goFiles.map((file) => file.path),
    testGoFiles: testFiles.map((file) => file.path),
    xtestGoFiles: xtestFiles.map((file) => file.path),
    imports: uniquePaths(importsOf(goFiles)),
    testImports: uniquePaths(importsOf(testFiles)),
    xtestImports: uniquePaths(importsOf(xtestFiles)),
    tests: testsOf(testFiles),
    xtests: testsOf(xtestFiles),
    testMain: has(testFiles) ? 'test' : has(xtestFiles) ? 'xtest' : undefined,
  }
}

const missingLocalImports = (
  files: ReadonlyArray<ParsedFile>,
  modulePath: string,
  packages: ReadonlyMap<string, GoPackage>
) =>
  importsOf(files)
    .filter((entry) => isLocal(entry.path, modulePath) && (packages.get(entry.path)?.goFiles.length ?? 0) === 0)
    .map((entry) =>
      error(`package ${entry.path} is not in the module`, entry.file, entry.position.line, entry.position.column)
    )

const importCycles = (packages: ReadonlyMap<string, GoPackage>): ReadonlyArray<Diagnostic> => {
  const state = new Map<string, 'visiting' | 'done'>()
  const cycles: Array<Diagnostic> = []
  const visit = (importPath: string, trail: ReadonlyArray<string>) => {
    if (state.get(importPath) === 'done') return
    if (state.get(importPath) === 'visiting') {
      const cycle = [...trail.slice(trail.indexOf(importPath)), importPath]
      cycles.push(error(`import cycle not allowed: ${cycle.join(' -> ')}`))
      return
    }
    state.set(importPath, 'visiting')
    for (const dependency of packages.get(importPath)?.imports ?? []) {
      if (packages.has(dependency)) visit(dependency, [...trail, importPath])
    }
    state.set(importPath, 'done')
  }
  for (const importPath of packages.keys()) visit(importPath, [])
  return cycles
}

export const planGoBuild = (files: ProjectFiles, std: ReadonlySet<string>): GoBuildPlan => {
  const goMod = files.get('go.mod')
  if (goMod === undefined) return { _tag: 'Invalid', diagnostics: [error('go.mod file not found in the project root')] }
  const { path: modulePath, language } = parseGoMod(textOf(goMod))
  if (modulePath === undefined) {
    return { _tag: 'Invalid', diagnostics: [error('go.mod has no module directive', 'go.mod', 1, 1)] }
  }

  const parsed = sourceFiles(files)
  const packages = new Map<string, GoPackage>()
  const diagnostics: Array<Diagnostic> = [...findUnavailableImports(files, std)]
  for (const [dir, dirFiles] of groupByDir(parsed)) {
    const result = makePackage(modulePath, dir, dirFiles)
    if ('conflict' in result) diagnostics.push(result.conflict)
    else packages.set(result.importPath, result)
  }
  diagnostics.push(...missingLocalImports(parsed, modulePath, packages), ...importCycles(packages))

  return diagnostics.length > 0
    ? { _tag: 'Invalid', diagnostics }
    : { _tag: 'Planned', module: { path: modulePath, language: `go${language ?? '1.24'}`, packages } }
}

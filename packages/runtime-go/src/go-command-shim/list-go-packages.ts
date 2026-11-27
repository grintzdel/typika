import { GO_LIST_FIELDS } from '../domain/constants/go-list-field.constant.ts'
import { GoRelease } from '../domain/constants/go-release.constant.ts'
import type {
  GoListError,
  GoListField,
  GoListModule,
  GoListPackage,
  StdPackages,
} from '../domain/go-list.domain-model.ts'
import { matchesBuildContext } from '../match-build-context/match-build-context.ts'
import { parseGoSource } from '../parse-go-source/parse-go-source.ts'

export type GoListQuery = {
  readonly goroot: string
  readonly root: string
  readonly dir: string
  readonly files: ReadonlyMap<string, string>
  readonly std: StdPackages
  readonly patterns: ReadonlyArray<string>
  readonly test: boolean
  readonly deps: boolean
}

export type GoListResult =
  | {
      readonly _tag: 'Listed'
      readonly packages: ReadonlyArray<GoListPackage>
      readonly warnings: ReadonlyArray<string>
    }
  | { readonly _tag: 'Failed'; readonly message: string }

type ImportAt = { readonly path: string; readonly file: string; readonly line: number; readonly column: number }

type Problem =
  | {
      readonly _tag: 'Parse'
      readonly file: string
      readonly line: number
      readonly column: number
      readonly err: string
    }
  | { readonly _tag: 'Conflict'; readonly err: string }
  | { readonly _tag: 'NoGo'; readonly err: string }

type Scan = {
  readonly dir: string
  readonly importPath: string
  readonly name: string
  readonly goFiles: ReadonlyArray<string>
  readonly ignoredGoFiles: ReadonlyArray<string>
  readonly testGoFiles: ReadonlyArray<string>
  readonly xtestGoFiles: ReadonlyArray<string>
  readonly imports: ReadonlyArray<ImportAt>
  readonly testImports: ReadonlyArray<ImportAt>
  readonly xtestImports: ReadonlyArray<ImportAt>
  readonly problem: Problem | undefined
}

type Spec =
  | { readonly _tag: 'Std'; readonly path: string }
  | { readonly _tag: 'Missing'; readonly path: string; readonly error: GoListError }
  | { readonly _tag: 'Project'; readonly scan: Scan }
  | { readonly _tag: 'Test'; readonly scan: Scan }
  | { readonly _tag: 'XTest'; readonly scan: Scan }
  | { readonly _tag: 'Recompiled'; readonly scan: Scan; readonly forTest: Scan }

type Node = { readonly pkg: GoListPackage; readonly deps: ReadonlyArray<string> }

const dirOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))
const baseOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)

const resolvePath = (base: string, path: string) => {
  const segments: Array<string> = []
  for (const segment of (path.startsWith('/') ? path : `${base}/${path}`).split('/')) {
    if (segment === '..') segments.pop()
    else if (segment !== '' && segment !== '.') segments.push(segment)
  }
  return `/${segments.join('/')}`
}

const within = (parent: string, path: string) =>
  path === parent ? '' : path.startsWith(`${parent}/`) ? path.slice(parent.length + 1) : undefined

const uniqueSorted = (imports: ReadonlyArray<ImportAt>) => [...new Set(imports.map((entry) => entry.path))].toSorted()

const testId = (importPath: string, forTest: string) => `${importPath} [${forTest}.test]`

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === false ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)

const compact = (pkg: GoListPackage): GoListPackage => {
  const kept: { -readonly [Field in GoListField]?: GoListPackage[Field] } = {}
  const keep = <Field extends GoListField>(field: Field, value: GoListPackage[Field]) => {
    if (!isEmpty(value)) kept[field] = value
  }
  for (const field of GO_LIST_FIELDS) keep(field, pkg[field])
  return { ...kept, ImportPath: pkg.ImportPath }
}

const missing = (path: string, error: GoListError): Spec => ({ _tag: 'Missing', path, error })

const hasInternalTest = (scan: Scan) => scan.testGoFiles.length > 0 || scan.name === 'main'

const importsFor = (imports: ReadonlyArray<ImportAt>, map: (path: string, at: ImportAt | undefined) => string) => {
  const ids = uniqueSorted(imports).map(
    (path) =>
      [
        path,
        map(
          path,
          imports.find((entry) => entry.path === path)
        ),
      ] as const
  )
  return {
    Imports: ids.map(([, id]) => id),
    ImportMap: Object.fromEntries(ids.filter(([path, id]) => path !== id)),
    deps: ids.map(([, id]) => id),
  }
}

const byImportStack = (a: GoListError, b: GoListError) => {
  const [left, right] = [a.ImportStack.at(-1), b.ImportStack.at(-1)]
  if (left === undefined || right === undefined) {
    return left === right ? a.Err.localeCompare(b.Err) : left === undefined ? -1 : 1
  }
  return left < right ? -1 : left > right ? 1 : 0
}

const parseGoMod = (content: string) => ({
  path: /^\s*module\s+"?([^\s"]+)"?\s*$/m.exec(content)?.[1],
  language: /^\s*go\s+(\d+\.\d+(?:\.\d+)?)/m.exec(content)?.[1],
})

const isIgnoredDir = (dir: string) =>
  dir !== '' &&
  dir.split('/').some((segment) => segment.startsWith('.') || segment.startsWith('_') || segment === 'testdata')

const notFoundMessage = (path: string, goroot: string) =>
  path.split('/')[0]?.includes('.') === true
    ? `no required module provides package ${path}; to add it:\n\tgo get ${path}`
    : `package ${path} is not in std (${goroot}/src/${path})`

const firstTokenOf = (text: string) =>
  /^\S+/.exec(
    text
      .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
      .replaceAll(/\/\/.*$/gm, '')
      .trim()
  )?.[0]

const scanProject = (files: ReadonlyMap<string, string>, root: string, modulePath: string) => {
  const nestedModules = [...files.keys()].filter((path) => path.endsWith('/go.mod')).map(dirOf)
  const dirs = new Set([''])
  const goFilesByDir = new Map<string, Array<string>>()
  for (const path of files.keys()) {
    for (let dir = dirOf(path); dir !== ''; dir = dirOf(dir)) dirs.add(dir)
    if (path.endsWith('.go')) goFilesByDir.set(dirOf(path), [...(goFilesByDir.get(dirOf(path)) ?? []), baseOf(path)])
  }
  const inNestedModule = (dir: string) => nestedModules.some((module) => dir === module || dir.startsWith(`${module}/`))
  const absDir = (dir: string) => (dir === '' ? root : `${root}/${dir}`)

  const scan = (dir: string): Scan => {
    const goFiles: Array<string> = []
    const ignoredGoFiles: Array<string> = []
    const testGoFiles: Array<string> = []
    const xtestGoFiles: Array<string> = []
    const imports: Array<ImportAt> = []
    const testImports: Array<ImportAt> = []
    const xtestImports: Array<ImportAt> = []
    let name = ''
    let firstFile = ''
    let problem: Problem | undefined
    const names = (goFilesByDir.get(dir) ?? []).filter((file) => !file.startsWith('_') && !file.startsWith('.'))
    for (const file of names.toSorted()) {
      const path = dir === '' ? file : `${dir}/${file}`
      const text = files.get(path) ?? ''
      const source = parseGoSource(text)
      const isTest = file.endsWith('_test.go')
      if (!matchesBuildContext(file, source?.buildConstraint)) {
        ignoredGoFiles.push(file)
        continue
      }
      if (source === undefined) {
        const token = firstTokenOf(text)
        problem ??= {
          _tag: 'Parse',
          file: path,
          line: 1,
          column: 1,
          err: `expected 'package', found ${token === undefined ? "'EOF'" : token}`,
        }
        ;(isTest ? testGoFiles : goFiles).push(file)
        continue
      }
      let packageName = source.packageName
      const isXTest = isTest && packageName.endsWith('_test') && name !== packageName
      if (isXTest) packageName = packageName.slice(0, -'_test'.length)
      if (name === '') {
        name = packageName
        firstFile = file
      } else if (packageName !== name) {
        problem ??= {
          _tag: 'Conflict',
          err: `found packages ${name} (${firstFile}) and ${packageName} (${file}) in ${absDir(dir)}`,
        }
      }
      const at = source.imports
        .filter((entry) => entry.path !== 'C')
        .map((entry) => ({ path: entry.path, file: path, ...entry.position }))
      if (isXTest) {
        xtestGoFiles.push(file)
        xtestImports.push(...at)
      } else if (isTest) {
        testGoFiles.push(file)
        testImports.push(...at)
      } else {
        goFiles.push(file)
        imports.push(...at)
      }
    }
    if (goFiles.length + testGoFiles.length + xtestGoFiles.length === 0) {
      problem = {
        _tag: 'NoGo',
        err: `${ignoredGoFiles.length > 0 ? 'build constraints exclude all Go files in' : 'no Go files in'} ${absDir(dir)}`,
      }
    }
    return {
      dir,
      importPath: dir === '' ? modulePath : `${modulePath}/${dir}`,
      name,
      goFiles,
      ignoredGoFiles,
      testGoFiles,
      xtestGoFiles,
      imports,
      testImports,
      xtestImports,
      problem,
    }
  }

  const scans = new Map<string, Scan>()
  const scanOf = (dir: string) => {
    if (!dirs.has(dir) || inNestedModule(dir)) return undefined
    const cached = scans.get(dir) ?? scan(dir)
    scans.set(dir, cached)
    return cached
  }
  const packageDirs = [...goFilesByDir.keys()].filter((dir) => !isIgnoredDir(dir) && !inNestedModule(dir)).toSorted()
  return { absDir, scanOf, packageDirs }
}

export const listGoPackages = (query: GoListQuery): GoListResult => {
  const { goroot, root, std } = query
  const goMod = query.files.get('go.mod')
  const { path: modulePath, language } = parseGoMod(goMod ?? '')
  if (goMod === undefined || modulePath === undefined) {
    return {
      _tag: 'Failed',
      message: "go: go.mod file not found in current directory or any parent directory; see 'go help modules'",
    }
  }
  const module: GoListModule = {
    Path: modulePath,
    Main: true,
    Dir: root,
    GoMod: `${root}/go.mod`,
    GoVersion: language ?? GoRelease.LANGUAGE.replace(/^go/, ''),
  }
  const project = scanProject(query.files, root, modulePath)
  const localDir = (importPath: string) =>
    importPath === modulePath
      ? ''
      : importPath.startsWith(`${modulePath}/`)
        ? importPath.slice(modulePath.length + 1)
        : undefined
  const shortPath = (path: string) => {
    const relative = within(query.dir, path)
    return relative === undefined ? path : relative === '' ? '.' : relative
  }

  const specs = new Map<string, Spec>()
  const roots: Array<string> = []
  const warnings: Array<string> = []
  const addRoot = (id: string, spec: Spec) => {
    if (!specs.has(id)) specs.set(id, spec)
    if (!roots.includes(id)) roots.push(id)
  }

  const matchImportPath = (pattern: string) => {
    const dir = localDir(pattern)
    const scan = dir === undefined ? undefined : project.scanOf(dir)
    if (scan !== undefined) addRoot(pattern, { _tag: 'Project', scan })
    else if (std.has(pattern)) addRoot(pattern, { _tag: 'Std', path: pattern })
    else addRoot(pattern, missing(pattern, { ImportStack: [], Pos: '', Err: notFoundMessage(pattern, goroot) }))
  }

  const matchDirectory = (pattern: string) => {
    const path = resolvePath(query.dir, pattern)
    const inStd = within(`${goroot}/src`, path)
    if (inStd !== undefined && std.has(inStd)) return addRoot(inStd, { _tag: 'Std', path: inStd })
    const dir = within(root, path)
    const scan = dir === undefined ? undefined : project.scanOf(dir)
    if (scan !== undefined) return addRoot(scan.importPath, { _tag: 'Project', scan })
    const err =
      dir === undefined
        ? `directory ${path} outside main module or its selected dependencies`
        : `stat ${path}: directory not found`
    return addRoot(pattern, missing(pattern, { ImportStack: [], Pos: '', Err: err }))
  }

  const matchTree = (pattern: string) => {
    const base = pattern.slice(0, -'/...'.length)
    const baseDir =
      base.startsWith('.') || base.startsWith('/') ? within(root, resolvePath(query.dir, base)) : localDir(base)
    const scans = project.packageDirs
      .filter((dir) => baseDir !== undefined && (baseDir === '' || within(baseDir, dir) !== undefined))
      .flatMap((dir) => {
        const scan = project.scanOf(dir)
        return scan === undefined || scan.problem?._tag === 'NoGo' ? [] : [scan]
      })
      .toSorted((a, b) => a.importPath.localeCompare(b.importPath))
    if (scans.length === 0) warnings.push(`go: warning: "${pattern}" matched no packages`)
    for (const scan of scans) addRoot(scan.importPath, { _tag: 'Project', scan })
  }

  for (const pattern of query.patterns.length === 0 ? ['.'] : query.patterns) {
    if (pattern === '...' || pattern.endsWith('/...')) matchTree(pattern)
    else if (pattern.startsWith('.') || pattern.startsWith('/')) matchDirectory(pattern)
    else matchImportPath(pattern)
  }

  const projectImports = (dir: string) => uniqueSorted(project.scanOf(dir)?.imports ?? [])
  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    if (from === target) return true
    if (seen.has(from)) return false
    seen.add(from)
    const dir = localDir(from)
    return dir !== undefined && projectImports(dir).some((next) => reaches(next, target, seen))
  }

  const resolve = (path: string, at: ImportAt | undefined, stack: ReadonlyArray<string>): string => {
    if (specs.has(path)) return path
    const dir = localDir(path)
    const scan = dir === undefined ? undefined : project.scanOf(dir)
    if (scan !== undefined) specs.set(path, { _tag: 'Project', scan })
    else if (std.has(path)) specs.set(path, { _tag: 'Std', path })
    else {
      const Pos = at === undefined ? '' : `${shortPath(`${root}/${at.file}`)}:${at.line}:${at.column}`
      specs.set(path, missing(path, { ImportStack: stack, Pos, Err: notFoundMessage(path, goroot) }))
    }
    return path
  }

  const errorOf = (scan: Scan, stack: ReadonlyArray<string>): GoListError | undefined => {
    const { problem } = scan
    if (problem === undefined) return undefined
    if (problem._tag === 'Conflict') return { ImportStack: [], Pos: '', Err: problem.err }
    if (problem._tag === 'NoGo') return { ImportStack: [...stack, scan.importPath], Pos: '', Err: problem.err }
    return {
      ImportStack: [...stack, scan.importPath],
      Pos: `${shortPath(`${root}/${problem.file}`)}:${problem.line}:${problem.column}`,
      Err: problem.err,
    }
  }

  const projectPackage = (scan: Scan, error: GoListError | undefined): GoListPackage => ({
    Dir: project.absDir(scan.dir),
    ImportPath: scan.importPath,
    Name: scan.name,
    Module: module,
    GoFiles: scan.goFiles,
    CompiledGoFiles: error === undefined ? scan.goFiles : [],
    IgnoredGoFiles: scan.ignoredGoFiles,
    Imports: uniqueSorted(scan.imports),
    ...(error === undefined ? {} : { Error: error }),
    TestGoFiles: scan.testGoFiles,
    TestImports: uniqueSorted(scan.testImports),
    XTestGoFiles: scan.xtestGoFiles,
    XTestImports: uniqueSorted(scan.xtestImports),
  })

  const forTest = (path: string, target: Scan, at: ImportAt | undefined, stack: ReadonlyArray<string>) => {
    if (!hasInternalTest(target)) return resolve(path, at, stack)
    if (path === target.importPath) {
      const id = testId(path, target.importPath)
      if (!specs.has(id)) specs.set(id, { _tag: 'Test', scan: target })
      return id
    }
    const dir = localDir(path)
    const scan = dir === undefined ? undefined : project.scanOf(dir)
    if (scan === undefined || !reaches(path, target.importPath)) return resolve(path, at, stack)
    const id = testId(path, target.importPath)
    if (!specs.has(id)) specs.set(id, { _tag: 'Recompiled', scan, forTest: target })
    return id
  }

  const build = (id: string, spec: Spec, stack: ReadonlyArray<string>): Node => {
    const here = [...stack, id]
    switch (spec._tag) {
      case 'Std': {
        const pkg = std.get(spec.path) ?? { ImportPath: spec.path }
        const deps = (pkg.Imports ?? []).map((path) => resolve(path, undefined, here))
        return { pkg: { ...pkg, ...(pkg.Dir === undefined ? {} : { Dir: `${goroot}/${pkg.Dir}` }) }, deps }
      }
      case 'Missing':
        return { pkg: { ImportPath: spec.path, Error: spec.error }, deps: [] }
      case 'Project': {
        const { Imports, deps } = importsFor(spec.scan.imports, (path, at) => resolve(path, at, here))
        return { pkg: { ...projectPackage(spec.scan, errorOf(spec.scan, stack)), Imports }, deps }
      }
      case 'Test': {
        const { scan } = spec
        const error = errorOf(scan, stack)
        const all = [...scan.testImports, ...scan.imports]
        const raw = [...uniqueSorted(scan.testImports), ...uniqueSorted(scan.imports)]
        const deps = [...new Set(raw)].map((path) =>
          resolve(
            path,
            all.find((entry) => entry.path === path),
            here
          )
        )
        const goFiles = [...scan.goFiles, ...scan.testGoFiles]
        return {
          pkg: {
            ...projectPackage(scan, error),
            ImportPath: id,
            ForTest: scan.importPath,
            GoFiles: goFiles,
            CompiledGoFiles: error === undefined ? goFiles : [],
            Imports: raw,
          },
          deps,
        }
      }
      case 'XTest': {
        const { scan } = spec
        const { Imports, ImportMap, deps } = importsFor(scan.xtestImports, (path, at) => forTest(path, scan, at, here))
        return {
          pkg: {
            Dir: project.absDir(scan.dir),
            ImportPath: id,
            Name: `${scan.name}_test`,
            ForTest: scan.importPath,
            Module: module,
            GoFiles: scan.xtestGoFiles,
            CompiledGoFiles: scan.xtestGoFiles,
            Imports,
            ImportMap,
          },
          deps,
        }
      }
      default: {
        const { scan } = spec
        const { Imports, ImportMap, deps } = importsFor(scan.imports, (path, at) =>
          forTest(path, spec.forTest, at, here)
        )
        return {
          pkg: {
            ...projectPackage(scan, errorOf(scan, stack)),
            ImportPath: id,
            ForTest: spec.forTest.importPath,
            DepOnly: true,
            Imports,
            ImportMap,
          },
          deps,
        }
      }
    }
  }

  const nodes = new Map<string, Node>()
  const visiting = new Set<string>()
  const visit = (id: string, stack: ReadonlyArray<string>) => {
    const spec = specs.get(id)
    if (spec === undefined || nodes.has(id) || visiting.has(id)) return
    visiting.add(id)
    const node = build(id, spec, stack)
    if (query.deps) for (const dep of node.deps) visit(dep, [...stack, id])
    nodes.set(id, node)
  }

  for (const id of roots) visit(id, [])
  if (query.test) {
    for (const id of roots) {
      const spec = specs.get(id)
      if (spec?._tag !== 'Project') continue
      const { scan } = spec
      if (scan.testGoFiles.length + scan.xtestGoFiles.length === 0) continue
      if (hasInternalTest(scan)) {
        const test = testId(scan.importPath, scan.importPath)
        specs.set(test, { _tag: 'Test', scan })
        roots.push(test)
        visit(test, [])
      }
      if (scan.xtestGoFiles.length > 0) {
        const xtest = testId(`${scan.importPath}_test`, scan.importPath)
        specs.set(xtest, { _tag: 'XTest', scan })
        roots.push(xtest)
        visit(xtest, [])
      }
    }
  }

  const depsErrors = (id: string) => {
    const seen = new Set<string>([id])
    const errors: Array<GoListError> = []
    const walk = (current: string) => {
      for (const dep of nodes.get(current)?.deps ?? []) {
        if (seen.has(dep)) continue
        seen.add(dep)
        const error = nodes.get(dep)?.pkg.Error
        if (error !== undefined) errors.push(error)
        walk(dep)
      }
    }
    walk(id)
    return errors.toSorted(byImportStack)
  }

  const rootSet = new Set(roots)
  return {
    _tag: 'Listed',
    packages: [...nodes].map(([id, node]) => {
      const errors = depsErrors(id)
      return compact({
        ...node.pkg,
        DepOnly: node.pkg.DepOnly === true || !rootSet.has(id),
        ...(errors.length > 0 ? { CompiledGoFiles: [] } : {}),
        DepsErrors: errors,
      })
    }),
    warnings,
  }
}

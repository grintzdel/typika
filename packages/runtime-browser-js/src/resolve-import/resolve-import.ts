export type Resolution =
  | { readonly _tag: 'File'; readonly path: string }
  | { readonly _tag: 'Package'; readonly url: string }
  | { readonly _tag: 'Runner' }
  | { readonly _tag: 'Unresolved'; readonly message: string }

export type ResolveImportInput = {
  readonly specifier: string
  readonly importer: string
  readonly exists: (path: string) => boolean
  readonly dependencies: Readonly<Record<string, string>>
  readonly packageUrlTemplate: string
}

const NODE_BUILTINS = new Set([
  'assert',
  'buffer',
  'child_process',
  'crypto',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'process',
  'stream',
  'url',
  'util',
  'worker_threads',
  'zlib',
])

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.jsx', '.json']
const JS_TO_TS: Readonly<Record<string, ReadonlyArray<string>>> = {
  '.js': ['.ts', '.tsx'],
  '.mjs': ['.mts'],
  '.jsx': ['.tsx'],
}

const normalize = (segments: ReadonlyArray<string>): string | undefined => {
  const resolved: Array<string> = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment !== '..') resolved.push(segment)
    else if (resolved.pop() === undefined) return undefined
  }
  return resolved.join('/')
}

const candidatesOf = (path: string): ReadonlyArray<string> => {
  const extension = /\.[^./]+$/.exec(path)?.[0]
  const swapped =
    extension === undefined ? [] : (JS_TO_TS[extension] ?? []).map((ts) => path.slice(0, -extension.length) + ts)
  return [
    path,
    ...swapped,
    ...SOURCE_EXTENSIONS.map((candidate) => path + candidate),
    ...SOURCE_EXTENSIONS.map((candidate) => `${path}/index${candidate}`),
  ]
}

const resolveFile = ({ specifier, importer, exists }: ResolveImportInput): Resolution => {
  const base = specifier.startsWith('/') ? [] : importer.split('/').slice(0, -1)
  const path = normalize([...base, ...specifier.split('/')])
  if (path === undefined)
    return { _tag: 'Unresolved', message: `Cannot import "${specifier}": it is outside the project` }
  const found = candidatesOf(path).find(exists)
  return found === undefined
    ? { _tag: 'Unresolved', message: `Cannot find module "${specifier}"` }
    : { _tag: 'File', path: found }
}

const splitPackage = (specifier: string) => {
  const parts = specifier.split('/')
  const length = specifier.startsWith('@') ? 2 : 1
  return { name: parts.slice(0, length).join('/'), subpath: parts.slice(length).join('/') }
}

export const resolveImport = (input: ResolveImportInput): Resolution => {
  const { specifier, dependencies, packageUrlTemplate } = input
  if (specifier.startsWith('.') || specifier.startsWith('/')) return resolveFile(input)
  if (/^https?:\/\//.test(specifier)) return { _tag: 'Package', url: specifier }
  if (specifier === 'vitest') return { _tag: 'Runner' }

  const { name, subpath } = splitPackage(specifier)
  const version = dependencies[name]
  if (specifier.startsWith('node:') || (version === undefined && NODE_BUILTINS.has(name))) {
    return {
      _tag: 'Unresolved',
      message: `Cannot import "${specifier}": Node built-in modules are not available in the browser sandbox`,
    }
  }
  if (version === undefined) {
    return {
      _tag: 'Unresolved',
      message: `Cannot find package "${name}": add it to the dependencies of package.json`,
    }
  }
  return {
    _tag: 'Package',
    url: packageUrlTemplate
      .replace('{name}', name)
      .replace('{version}', encodeURIComponent(version))
      .replace('{path}', subpath === '' ? '' : `/${subpath}`),
  }
}

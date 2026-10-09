import { describe, expect, it } from 'vitest'

import { resolveImport, type ResolveImportInput } from './resolve-import.ts'

const files = new Set(['src/main.ts', 'src/shop/money.ts', 'src/shop/index.ts', 'src/util.js', 'data/prices.json'])

const resolve = (specifier: string, overrides: Partial<ResolveImportInput> = {}) =>
  resolveImport({
    specifier,
    importer: 'src/main.ts',
    exists: (path) => files.has(path),
    dependencies: { 'date-fns': '4.1.0', '@scope/pkg': '^2.0.0' },
    packageUrlTemplate: 'https://cdn.jsdelivr.net/npm/{name}@{version}{path}/+esm',
    ...overrides,
  })

describe('resolveImport', () => {
  it('resolves a relative import with its extension', () => {
    expect(resolve('./shop/money.ts')).toEqual({ _tag: 'File', path: 'src/shop/money.ts' })
  })

  it('resolves a relative import from a nested importer', () => {
    expect(resolve('../main.ts', { importer: 'src/shop/money.ts' })).toEqual({ _tag: 'File', path: 'src/main.ts' })
  })

  it('resolves an import without extension', () => {
    expect(resolve('./shop/money')).toEqual({ _tag: 'File', path: 'src/shop/money.ts' })
  })

  it('resolves a directory to its index', () => {
    expect(resolve('./shop')).toEqual({ _tag: 'File', path: 'src/shop/index.ts' })
  })

  it('resolves a .js import to the .ts source', () => {
    expect(resolve('./shop/money.js')).toEqual({ _tag: 'File', path: 'src/shop/money.ts' })
  })

  it('keeps a .js import that exists as is', () => {
    expect(resolve('./util.js')).toEqual({ _tag: 'File', path: 'src/util.js' })
  })

  it('resolves a JSON file', () => {
    expect(resolve('../data/prices.json')).toEqual({ _tag: 'File', path: 'data/prices.json' })
  })

  it('refuses an import that leaves the project', () => {
    expect(resolve('../../secret.ts')).toMatchObject({ _tag: 'Unresolved' })
  })

  it('reports a missing file', () => {
    expect(resolve('./missing.ts')).toEqual({ _tag: 'Unresolved', message: 'Cannot find module "./missing.ts"' })
  })

  it('routes vitest to the runner', () => {
    expect(resolve('vitest')).toEqual({ _tag: 'Runner' })
  })

  it('resolves a package listed in package.json to the CDN, pinned', () => {
    expect(resolve('date-fns')).toEqual({ _tag: 'Package', url: 'https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm' })
  })

  it('fills a template without a path placeholder', () => {
    expect(resolve('date-fns/addDays', { packageUrlTemplate: 'https://esm.sh/{name}@{version}{path}' })).toEqual({
      _tag: 'Package',
      url: 'https://esm.sh/date-fns@4.1.0/addDays',
    })
  })

  it('keeps the subpath of a scoped package', () => {
    expect(resolve('@scope/pkg/sub/path')).toEqual({
      _tag: 'Package',
      url: 'https://cdn.jsdelivr.net/npm/@scope/pkg@%5E2.0.0/sub/path/+esm',
    })
  })

  it('reports a package missing from package.json', () => {
    expect(resolve('lodash')).toEqual({
      _tag: 'Unresolved',
      message: 'Cannot find package "lodash": add it to the dependencies of package.json',
    })
  })

  it.each(['node:fs', 'fs', 'path/posix'])('refuses the Node built-in %s', (specifier) => {
    const resolution = resolve(specifier)
    expect(resolution._tag === 'Unresolved' && resolution.message).toContain('Node built-in modules are not available')
  })

  it('keeps an absolute URL as is', () => {
    expect(resolve('https://esm.sh/zod@4')).toEqual({ _tag: 'Package', url: 'https://esm.sh/zod@4' })
  })
})

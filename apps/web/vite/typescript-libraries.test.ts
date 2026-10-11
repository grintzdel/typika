import { describe, expect, it } from 'vitest'

import { collectTypeScriptLibraries } from './typescript-libraries.ts'

describe('collectTypeScriptLibraries', () => {
  const libraries = collectTypeScriptLibraries()

  it('holds lib.es2022 with every lib it references, and no DOM', () => {
    expect(libraries['/lib.es2022.d.ts']).toContain('/// <reference lib="es2021" />')
    expect(Object.keys(libraries)).toEqual(expect.arrayContaining(['/lib.es5.d.ts', '/lib.es2015.promise.d.ts']))
    expect(Object.keys(libraries)).not.toContain('/lib.dom.d.ts')
  })

  it('declares the vitest module from the test runner, with relative imports a resolver can follow', () => {
    expect(JSON.parse(libraries['/node_modules/vitest/package.json'] ?? '{}')).toMatchObject({ types: './index.d.ts' })
    expect(libraries['/node_modules/vitest/index.d.ts']).toContain("from './collector.js'")
    expect(libraries['/node_modules/vitest/collector.d.ts']).toContain('describe')
  })

  it('declares the globals of the runtime', () => {
    expect(libraries['/typika-globals.d.ts']).toContain('declare var console')
  })
})

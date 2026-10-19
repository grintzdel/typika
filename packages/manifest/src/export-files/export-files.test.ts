import { parse } from 'smol-toml'
import { describe, expect, it } from 'vitest'

import { withoutTypikaFiles, withParent } from './export-files.ts'

const MANIFEST = `schema = 1
name = "strategy-ts"
title = "Strategy"

[facets]
language = "typescript"
`

const FILES = new Map([
  ['typika.toml', MANIFEST],
  ['README.md', '# Strategy\n'],
  ['src/main.ts', 'main'],
  ['tour/01-overview.md', 'step'],
  ['exercises/fix-it/README.md', 'fix'],
  ['src/tour/guide.ts', 'kept'],
])

describe('withoutTypikaFiles', () => {
  it('leaves out the manifest, the tour and the exercises', () => {
    expect([...withoutTypikaFiles(FILES).keys()]).toEqual(['README.md', 'src/main.ts', 'src/tour/guide.ts'])
  })
})

describe('withParent', () => {
  it('records the parent ref as a top-level key of the manifest', () => {
    const manifest = withParent(FILES, 'github:typika/templates/strategy/ts@3f2c9a1e7b4d').get('typika.toml')

    expect(parse(String(manifest))).toEqual({
      schema: 1,
      name: 'strategy-ts',
      title: 'Strategy',
      parent: 'github:typika/templates/strategy/ts@3f2c9a1e7b4d',
      facets: { language: 'typescript' },
    })
    expect(String(manifest)).toContain(
      'title = "Strategy"\nparent = "github:typika/templates/strategy/ts@3f2c9a1e7b4d"\n\n[facets]'
    )
  })

  it('keeps a parent the manifest already declares', () => {
    const files = new Map([['typika.toml', `parent = "github:someone/else@0123456789ab"\n${MANIFEST}`]])

    expect(withParent(files, 'github:typika/templates/strategy/ts@3f2c9a1e7b4d').get('typika.toml')).toBe(
      files.get('typika.toml')
    )
  })

  it('leaves files without a manifest unchanged', () => {
    const files = new Map([['src/main.ts', 'main']])

    expect(withParent(files, 'github:typika/templates/strategy/ts@3f2c9a1e7b4d')).toEqual(files)
  })
})

import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'

import { archiveNameOf, projectArchiveOf } from './project-archive.domain-model.ts'

const REF = 'github:typika/templates/strategy/ts@3f2c9a1e7b4d'

const FILES = new Map([
  ['typika.toml', 'schema = 1\nname = "strategy-ts"\n\n[facets]\nlanguage = "typescript"\n'],
  ['README.md', '# Strategy\n'],
  ['src/main.ts', 'main'],
  ['tour/01-overview.md', 'step'],
])

const entriesOf = (bytes: Uint8Array) =>
  Object.fromEntries(Object.entries(unzipSync(bytes)).map(([path, content]) => [path, strFromU8(content)]))

describe('projectArchiveOf', () => {
  it('zips the project with its Typika files, the manifest naming its parent', () => {
    const archive = projectArchiveOf({ name: 'strategy-ts', ref: REF, files: FILES, includeTypikaFiles: true })

    const entries = entriesOf(archive.bytes)
    expect(archive.fileName).toBe('strategy-ts.zip')
    expect(Object.keys(entries).toSorted()).toEqual(['README.md', 'src/main.ts', 'tour/01-overview.md', 'typika.toml'])
    expect(entries['typika.toml']).toContain(`parent = "${REF}"`)
  })

  it('zips the project without its Typika files', () => {
    const archive = projectArchiveOf({ name: 'strategy-ts', ref: REF, files: FILES, includeTypikaFiles: false })

    expect(Object.keys(entriesOf(archive.bytes)).toSorted()).toEqual(['README.md', 'src/main.ts'])
  })
})

describe('archiveNameOf', () => {
  it('names the archive after the project, without characters a file name cannot hold', () => {
    expect(archiveNameOf('My pricing')).toBe('My pricing.zip')
    expect(archiveNameOf('a/b: c?')).toBe('a-b- c-.zip')
    expect(archiveNameOf('  ')).toBe('project.zip')
  })
})

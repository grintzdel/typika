import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { entryToml } from '../__tests__/registry.factory.ts'
import { RegistryEntrySchema } from '../domain/registry-entry.domain-model.ts'
import { decodeToml } from './decode-toml.ts'

const FILE = 'templates/official/strategy-ts.toml'

const decodeEntry = (source: string) => Effect.runPromise(Effect.flip(decodeToml(RegistryEntrySchema, FILE, source)))

describe('decodeToml', () => {
  it('decodes an entry and keeps its TOML date as an ISO date', async () => {
    const entry = await Effect.runPromise(decodeToml(RegistryEntrySchema, FILE, entryToml()))

    expect(entry).toEqual({
      ref: 'github:typika/templates/strategy/ts@2be9bdff96b6',
      maintainers: ['github:maoudin'],
      category: 'official',
      added: '2026-10-08',
    })
  })

  it('reports missing, unknown and invalid fields together', async () => {
    const error = await decodeEntry(
      'ref = "github:typika/templates/strategy/ts@2be9bdff96b6"\ncategory = "vendor"\nadded = 2026-10-08\nstars = 3\n'
    )

    expect(error.issues.map((issue) => [issue.code, issue.path])).toEqual(
      expect.arrayContaining([
        ['E_MISSING_FIELD', 'maintainers'],
        ['E_INVALID_VALUE', 'category'],
        ['E_UNKNOWN_FIELD', 'stars'],
      ])
    )
  })

  it('reports a TOML syntax error with the entry file', async () => {
    const error = await decodeEntry('ref = \n')

    expect(error.issues).toMatchObject([{ code: 'E_TOML_PARSE', path: FILE }])
  })
})

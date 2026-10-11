import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../__tests__/registry.factory.ts'
import { indexJsonSchema } from './index-json-schema.ts'

describe('indexJsonSchema', () => {
  it('matches the schema committed in the registry', () => {
    const committed: unknown = JSON.parse(
      readFileSync(join(REPO_ROOT, 'registry', 'schema', 'index.schema.json'), 'utf8')
    )

    expect(committed).toEqual(indexJsonSchema())
  })
})

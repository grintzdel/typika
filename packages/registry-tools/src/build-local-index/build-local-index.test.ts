import { join } from 'node:path'

import { hasErrors } from '@typika/template-check'
import { describe, expect, it } from 'vitest'

import { buildLocalIndex } from './build-local-index.ts'

const REGISTRY = join(import.meta.dirname, '..', '..', '..', '..', 'registry')

describe('buildLocalIndex', () => {
  it('builds the index of the local registry from the pinned commits', { timeout: 30_000 }, async () => {
    const { checks, index } = await buildLocalIndex(REGISTRY)

    expect(hasErrors(checks)).toBe(false)
    expect(index?.templates.map((template) => template.name)).toContain('strategy-ts')
    expect(index?.registryCommit).toMatch(/^[0-9a-f]{12}$/)
  })
})

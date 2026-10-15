import { join } from 'node:path'

import { hasErrors } from '@typika/template-check'
import { describe, expect, it } from 'vitest'

import { buildLocalIndex, MONOREPO_CHECKOUTS } from './build-local-index.ts'

const REGISTRY = join(import.meta.dirname, '..', '..', '..', '..', 'registry')
const STRATEGY = new Set(
  ['ts', 'go', 'kotlin'].flatMap((language) => [`strategy-${language}`, `strategy-base-${language}`])
)

describe('buildLocalIndex', () => {
  it('builds the index of the local registry from the pinned commits', { timeout: 60_000 }, async () => {
    const { checks, index, deprecated } = await buildLocalIndex(REGISTRY, MONOREPO_CHECKOUTS, { only: STRATEGY })

    expect(hasErrors(checks)).toBe(false)
    expect(index?.templates.map((template) => template.name).toSorted()).toEqual([...STRATEGY].toSorted())
    expect(index?.registryCommit).toMatch(/^[0-9a-f]{12}$/)
    expect(deprecated.size).toBe(0)
    expect(checks.find((check) => check.name === 'strategy-kotlin')).toMatchObject({ exercisesRun: false })
  })
})

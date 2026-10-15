import { join } from 'node:path'

import { providedKotlinCompilerUrl } from '@typika/kotlin-compiler/provided'
import { hasErrors } from '@typika/template-check'
import { describe, expect, it } from 'vitest'

import { buildLocalIndex, MONOREPO_CHECKOUTS } from './build-local-index.ts'

const REGISTRY = join(import.meta.dirname, '..', '..', '..', '..', 'registry')
const STRATEGY = new Set(
  ['ts', 'go', 'kotlin'].flatMap((language) => [`strategy-${language}`, `strategy-base-${language}`])
)

describe('buildLocalIndex with a Kotlin compiler', () => {
  it('runs the exercises of the Kotlin templates', async () => {
    const { checks, index } = await buildLocalIndex(REGISTRY, MONOREPO_CHECKOUTS, {
      kotlinCompilerUrl: providedKotlinCompilerUrl(),
      only: STRATEGY,
    })

    expect(hasErrors(checks)).toBe(false)
    expect(checks.find((check) => check.name === 'strategy-kotlin')).toMatchObject({ exercisesRun: true })
    expect(index?.templates.map((template) => template.name)).toContain('strategy-kotlin')
  })
})

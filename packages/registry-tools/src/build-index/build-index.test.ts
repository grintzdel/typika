import { gzipSync } from 'node:zlib'

import { runTestsInProcess } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { beforeAll, describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../__tests__/registry.factory.ts'
import { checkRegistry, type RegistryReport } from '../check-registry/check-registry.ts'
import { RegistryIndexSchema, type RegistryIndex } from '../domain/registry-index.domain-model.ts'
import { readRegistry } from '../read-registry/read-registry.ts'
import { makeGitResolver } from '../resolve-ref/resolve-ref.ts'
import { buildIndex, INDEX_MAX_GZIP_BYTES } from './build-index.ts'

let report: RegistryReport
let index: RegistryIndex

beforeAll(async () => {
  report = await Effect.runPromise(
    checkRegistry(
      await readRegistry(`${REPO_ROOT}/registry`),
      makeGitResolver(REPO_ROOT, { 'typika/templates': 'templates' }),
      runTestsInProcess
    )
  )
  index = buildIndex({
    templates: report.templates,
    vocabulary: report.vocabulary,
    generatedAt: '2026-10-12T08:00:00.000Z',
    registryCommit: '14d396d46047',
    updatedAtOf: (file) => (file.endsWith('strategy-ts.toml') ? '2026-10-12' : undefined),
  })
}, 30_000)

const templateNamed = (name: string) => index.templates.find((template) => template.name === name)

describe('buildIndex on the local registry', () => {
  it('checks the local registry against the commits its entries pin', () => {
    expect(report.checks.flatMap((entry) => entry.issues.filter((issue) => issue.code.startsWith('E_')))).toEqual([])
  })

  it('produces an index that matches its schema, under the size limit', () => {
    expect(Schema.decodeUnknownExit(RegistryIndexSchema)(index)._tag).toBe('Success')
    expect(index.templates).toHaveLength(38)
    expect(gzipSync(JSON.stringify(index)).byteLength).toBeLessThan(INDEX_MAX_GZIP_BYTES)
  })

  it('resolves the base to its pinned ref and the variants to template names', () => {
    expect(templateNamed('strategy-ts')).toMatchObject({
      ref: 'github:typika/templates/strategy/ts@2be9bdff96b6',
      addedAt: '2026-10-08',
      updatedAt: '2026-10-12',
      manifest: {
        base: 'github:typika/templates/strategy-base/ts@a17e93a7af3e',
        variants: { go: 'strategy-go', kotlin: 'strategy-kotlin' },
      },
    })
  })

  it('keeps the tour titles, the exercises and the role of each template', () => {
    const strategy = templateNamed('strategy-ts')

    expect(strategy?.manifest.tour.steps[0]).toEqual({ id: 'overview', title: 'Two ways to ship, two ways to price' })
    expect(strategy?.manifest.exercises).toContainEqual({
      name: 'add-pickup-point-option',
      kind: 'refactor',
      title: 'Add a pickup-point shipping option',
    })
    expect(templateNamed('strategy-base-ts')?.manifest).toMatchObject({ role: 'base', base: null, tour: { steps: [] } })
  })

  it('builds the search text from the title, the topic labels and the tour', () => {
    const text = templateNamed('strategy-ts')?.search.text.split(' ')

    expect(text).toEqual(expect.arrayContaining(['strategy', 'shipping', 'open', 'closed', 'delegates']))
    expect(new Set(text).size).toBe(text?.length)
  })

  it('splits each topic into its category and family', () => {
    expect(index.vocabulary.topics).toContainEqual({
      id: 'design-pattern/behavioral/strategy',
      label: 'Strategy',
      category: 'design-pattern',
      family: 'behavioral',
    })
    expect(index.vocabulary.topics).toContainEqual({
      id: 'principle/open-closed',
      label: 'Open/closed',
      category: 'principle',
    })
  })
})

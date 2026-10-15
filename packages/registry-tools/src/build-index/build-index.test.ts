import { gzipSync } from 'node:zlib'

import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { beforeAll, describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../__tests__/registry.factory.ts'
import { checkRegistry, type RegistryReport } from '../check-registry/check-registry.ts'
import { RegistryIndexSchema, type RegistryIndex } from '../domain/registry-index.domain-model.ts'
import type { TemplateHealth } from '../domain/template-health.domain-model.ts'
import { readRegistry } from '../read-registry/read-registry.ts'
import { makeGitResolver } from '../resolve-ref/resolve-ref.ts'
import { buildIndex, INDEX_MAX_GZIP_BYTES } from './build-index.ts'

const BROKEN: TemplateHealth = {
  status: 'broken',
  checkedAt: '2026-10-12T03:00:00.000Z',
  brokenSince: '2026-10-12T03:00:00.000Z',
  checks: { boot: 'pass', tests: 'fail', exercises: 'pass', deps: 'skip' },
  runUrl: null,
}

let report: RegistryReport
let index: RegistryIndex

beforeAll(async () => {
  report = await Effect.runPromise(
    checkRegistry(
      await readRegistry(`${REPO_ROOT}/registry`),
      makeGitResolver({ 'typika/templates': { repo: REPO_ROOT, prefix: 'templates' } }),
      {}
    )
  )
  index = buildIndex({
    templates: report.templates,
    vocabulary: report.vocabulary,
    generatedAt: '2026-10-12T08:00:00.000Z',
    registryCommit: '14d396d46047',
    updatedAtOf: (file) => (file.endsWith('strategy-ts.toml') ? '2026-10-12' : undefined),
    healthOf: (name) => (name === 'strategy-ts' ? BROKEN : undefined),
  })
}, 60_000)

const templateNamed = (name: string) => index.templates.find((template) => template.name === name)

describe('buildIndex on the local registry', () => {
  it('checks the local registry against the commits its entries pin', () => {
    expect(report.checks.flatMap((entry) => entry.issues.filter((issue) => issue.code.startsWith('E_')))).toEqual([])
  })

  it('produces an index that matches its schema, under the size limit', () => {
    expect(Schema.decodeUnknownExit(RegistryIndexSchema)(index)._tag).toBe('Success')
    expect(index.templates).toHaveLength(72)
    expect(gzipSync(JSON.stringify(index)).byteLength).toBeLessThan(INDEX_MAX_GZIP_BYTES)
  })

  it('resolves the base to its pinned ref and the variants to template names', () => {
    expect(templateNamed('strategy-ts')).toMatchObject({
      ref: 'github:typika/templates/strategy/ts@1318eae7665d',
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

  it('builds the search text from the title, the keywords, the topic labels and the tour', () => {
    const text = templateNamed('strategy-ts')?.search.text.split(' ')

    expect(text).toEqual(expect.arrayContaining(['strategy', 'switch', 'shipping', 'open', 'closed', 'delegates']))
    expect(new Set(text).size).toBe(text?.length)
  })

  it('adds the keywords of the manifest to the search text', () => {
    const withKeywords = report.templates.map((template) =>
      template.manifest.name === 'strategy-ts'
        ? { ...template, manifest: { ...template.manifest, keywords: ['switch', 'if-else'] } }
        : template
    )
    const rebuilt = buildIndex({
      templates: withKeywords,
      vocabulary: report.vocabulary,
      generatedAt: '2026-10-12T08:00:00.000Z',
      registryCommit: '14d396d46047',
      updatedAtOf: () => undefined,
      healthOf: () => undefined,
    })

    expect(rebuilt.templates.find((template) => template.name === 'strategy-ts')?.search.text.split(' ')).toEqual(
      expect.arrayContaining(['switch', 'if-else'])
    )
  })

  it('carries the health of each template, and null where no run checked it', () => {
    expect(templateNamed('strategy-ts')?.health).toEqual(BROKEN)
    expect(templateNamed('strategy-base-ts')?.health).toBeNull()
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

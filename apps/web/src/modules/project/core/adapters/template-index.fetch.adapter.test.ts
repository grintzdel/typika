import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeTemplateIndexFetch } from './template-index.fetch.adapter.ts'

const URL = 'https://registry.example.org/index.json'

const indexTemplate = (name: string, role: 'template' | 'base' = 'template') => ({
  name,
  ref: `github:typika/templates/${name}@0123456789ab`,
  category: 'official',
  maintainers: ['github:maoudin'],
  addedAt: '2026-10-08',
  updatedAt: '2026-10-08',
  manifest: {
    title: 'Strategy',
    summary: 'Replace a growing switch.',
    license: 'MIT-0',
    authors: ['github:maoudin'],
    role,
    facets: {
      language: 'typescript',
      framework: [],
      library: [],
      paradigm: ['oop'],
      topic: [],
      level: 'intermediate',
      useCase: [],
    },
    runtime: { kind: 'browser-js' },
    base: null,
    variants: {},
    tour: { steps: [] },
    exercises: [],
  },
  parent: null,
  health: null,
  search: { text: name },
})

const registryIndex = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  schema: 1,
  generatedAt: '2026-10-12T08:00:00.000Z',
  registryCommit: '0123456789ab',
  vocabulary: { topics: [], languages: ['typescript'] },
  templates: [indexTemplate('strategy-ts'), indexTemplate('strategy-base-ts', 'base')],
  ...overrides,
})

const fetchReturning = (...bodies: ReadonlyArray<unknown>) => {
  const fetchFn = vi.fn<typeof fetch>()
  for (const body of bodies)
    fetchFn.mockImplementationOnce(async () =>
      body instanceof Error ? Promise.reject(body) : Response.json(body, { status: body === 404 ? 404 : 200 })
    )
  return fetchFn
}

const failureOf = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && exit.cause.reasons[0]

describe('makeTemplateIndexFetch', () => {
  it('lists the templates of the index with their pinned ref', async () => {
    const index = makeTemplateIndexFetch(URL, fetchReturning(registryIndex()))

    expect(await Effect.runPromise(index.entries)).toEqual([
      {
        name: 'strategy-ts',
        ref: 'github:typika/templates/strategy-ts@0123456789ab',
        role: 'template',
        title: 'Strategy',
        summary: 'Replace a growing switch.',
        language: 'typescript',
        level: 'intermediate',
      },
      expect.objectContaining({ name: 'strategy-base-ts', role: 'base' }),
    ])
  })

  it('downloads the index once', async () => {
    const fetchFn = fetchReturning(registryIndex())
    const index = makeTemplateIndexFetch(URL, fetchFn)

    await Effect.runPromise(index.entries)
    await Effect.runPromise(index.entries)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith(URL)
  })

  it('fails on a network error, then downloads the index again on the next try', async () => {
    const index = makeTemplateIndexFetch(URL, fetchReturning(new TypeError('Failed to fetch'), registryIndex()))

    expect(failureOf(await Effect.runPromiseExit(index.entries))).toMatchObject({
      error: { _tag: 'ProjectIndexUnavailableError', failure: 'network' },
    })
    expect(await Effect.runPromise(index.entries)).toHaveLength(2)
  })

  it('fails when the server does not answer with the index', async () => {
    const exit = await Effect.runPromiseExit(makeTemplateIndexFetch(URL, fetchReturning(404)).entries)

    expect(failureOf(exit)).toMatchObject({ error: { failure: 'network' } })
  })

  it('refuses an index of an unknown major version', async () => {
    const exit = await Effect.runPromiseExit(
      makeTemplateIndexFetch(URL, fetchReturning(registryIndex({ schema: 2 }))).entries
    )

    expect(failureOf(exit)).toMatchObject({ error: { failure: 'unsupported' } })
  })

  it('refuses an index that does not match its schema', async () => {
    const exit = await Effect.runPromiseExit(
      makeTemplateIndexFetch(URL, fetchReturning(registryIndex({ templates: [{ name: 'strategy-ts' }] }))).entries
    )

    expect(failureOf(exit)).toMatchObject({ error: { failure: 'invalid' } })
  })
})

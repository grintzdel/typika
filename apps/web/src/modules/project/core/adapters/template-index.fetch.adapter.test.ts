import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { registryIndex } from '../../../shared/__tests__/registry-index.factory.ts'
import { makeTemplateIndexFetch } from './template-index.fetch.adapter.ts'

const URL = 'https://registry.example.org/index.json'

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
})

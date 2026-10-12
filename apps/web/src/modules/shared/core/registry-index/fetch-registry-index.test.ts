import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { indexTemplate, registryIndex } from '../../__tests__/registry-index.factory.ts'
import { fetchRegistryIndex } from './fetch-registry-index.ts'

const URL = 'https://registry.example.org/index.json'

const fetchReturning = (body: unknown) =>
  vi.fn<typeof fetch>(async () =>
    body instanceof Error ? Promise.reject(body) : Response.json(body, { status: body === 404 ? 404 : 200 })
  )

const failureOf = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && exit.cause.reasons[0]

describe('fetchRegistryIndex', () => {
  it('decodes the index', async () => {
    const fetchFn = fetchReturning(registryIndex({ templates: [indexTemplate('strategy-ts')] }))

    const index = await Effect.runPromise(fetchRegistryIndex(URL, fetchFn))

    expect(index.templates.map((template) => template.name)).toEqual(['strategy-ts'])
    expect(fetchFn).toHaveBeenCalledWith(URL)
  })

  it('fails on a network error', async () => {
    const exit = await Effect.runPromiseExit(fetchRegistryIndex(URL, fetchReturning(new TypeError('Failed to fetch'))))

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'RegistryIndexUnavailableError', failure: 'network' } })
  })

  it('fails when the server does not answer with the index', async () => {
    const exit = await Effect.runPromiseExit(fetchRegistryIndex(URL, fetchReturning(404)))

    expect(failureOf(exit)).toMatchObject({ error: { failure: 'network' } })
  })

  it('refuses an index of an unknown major version', async () => {
    const exit = await Effect.runPromiseExit(fetchRegistryIndex(URL, fetchReturning({ ...registryIndex(), schema: 2 })))

    expect(failureOf(exit)).toMatchObject({ error: { failure: 'unsupported' } })
  })

  it('refuses an index that does not match its schema', async () => {
    const exit = await Effect.runPromiseExit(
      fetchRegistryIndex(URL, fetchReturning({ ...registryIndex(), templates: [{ name: 'strategy-ts' }] }))
    )

    expect(failureOf(exit)).toMatchObject({ error: { failure: 'invalid' } })
  })
})

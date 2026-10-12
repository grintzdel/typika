import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { registryIndex } from '../../../shared/__tests__/registry-index.factory.ts'
import { makeRegistryIndexFetch } from './registry-index.fetch.adapter.ts'

const URL = 'https://registry.example.org/index.json'

describe('makeRegistryIndexFetch', () => {
  it('downloads the index once', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json(registryIndex()))
    const adapter = makeRegistryIndexFetch(URL, fetchFn)

    await Effect.runPromise(adapter.index)
    const index = await Effect.runPromise(adapter.index)

    expect(index.templates).toHaveLength(2)
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('downloads the index again after a failure', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json(registryIndex()))
    const adapter = makeRegistryIndexFetch(URL, fetchFn)

    expect(Exit.isFailure(await Effect.runPromiseExit(adapter.index))).toBe(true)
    expect(Exit.isSuccess(await Effect.runPromiseExit(adapter.index))).toBe(true)
  })
})

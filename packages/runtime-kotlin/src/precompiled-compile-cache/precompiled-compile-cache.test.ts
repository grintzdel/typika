import { describe, expect, it, vi } from 'vitest'

import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'
import { makeMemoryCompileCache } from '../memory-compile-cache/memory-compile-cache.ts'
import { makePrecompiledCompileCache } from './precompiled-compile-cache.ts'

const ARTIFACTS_URL = 'http://app.test/registry/artifacts/kotlin/'

const compiled = (code: string): KotlinCompilation => ({
  _tag: 'Compiled',
  artifact: { kind: 'js', code, sourceMap: '{}' },
  diagnostics: [],
})

const precompiledAnswering = (response: Response | Error) => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  if (response instanceof Error) fetch.mockRejectedValue(response)
  else fetch.mockResolvedValue(response)
  const cache = makeMemoryCompileCache(10_000)
  return { fetch, cache, precompiled: makePrecompiledCompileCache({ artifactsUrl: ARTIFACTS_URL, cache, fetch }) }
}

describe('makePrecompiledCompileCache', () => {
  it('returns a compilation of its cache without fetching an artifact', async () => {
    const { fetch, cache, precompiled } = precompiledAnswering(Response.json(compiled('artifact')))
    await cache.set('a', compiled('cached'))

    expect(await precompiled.get('a')).toEqual(compiled('cached'))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches the artifact of a key its cache misses', async () => {
    const { fetch, precompiled } = precompiledAnswering(Response.json(compiled('artifact')))

    expect(await precompiled.get('a')).toEqual(compiled('artifact'))
    expect(fetch).toHaveBeenCalledWith(new URL('a.json', ARTIFACTS_URL))
  })

  it('misses when the artifact is not found', async () => {
    const { precompiled } = precompiledAnswering(new Response('Not found', { status: 404 }))

    expect(await precompiled.get('a')).toBeUndefined()
  })

  it('misses when the artifact is not a compilation', async () => {
    const { precompiled } = precompiledAnswering(new Response('<!doctype html>', { status: 200 }))

    expect(await precompiled.get('a')).toBeUndefined()
  })

  it('misses when the artifact cannot be fetched', async () => {
    const { precompiled } = precompiledAnswering(new TypeError('Failed to fetch'))

    expect(await precompiled.get('a')).toBeUndefined()
  })

  it('stores compilations in its cache', async () => {
    const { fetch, cache, precompiled } = precompiledAnswering(new Response('Not found', { status: 404 }))

    await precompiled.set('a', compiled('compiled'))

    expect(await cache.get('a')).toEqual(compiled('compiled'))
    expect(await precompiled.get('a')).toEqual(compiled('compiled'))
    expect(fetch).not.toHaveBeenCalled()
  })
})

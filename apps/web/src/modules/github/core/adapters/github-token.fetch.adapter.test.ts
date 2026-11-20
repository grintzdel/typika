import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeGitHubTokenFetch } from './github-token.fetch.adapter.ts'

const INPUT = { code: 'the-code', codeVerifier: 'the-verifier' }

const jsonBodyOf = (init: RequestInit | undefined): unknown =>
  typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined

describe('makeGitHubTokenFetch', () => {
  it('asks the app server to exchange the code', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({ accessToken: 'gho_test', scopes: ['gist'] }))

    const session = await Effect.runPromise(makeGitHubTokenFetch(fetchFn).exchange(INPUT))

    expect(session).toEqual({ accessToken: 'gho_test', scopes: ['gist'] })
    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('/api/github/token')
    expect(init?.method).toBe('POST')
    expect(jsonBodyOf(init)).toEqual(INPUT)
  })

  it.each([
    ['a refusal', async () => Response.json({ error: 'GitHub refused the code' }, { status: 400 })],
    ['an answer of another shape', async () => Response.json({ token: 'gho_test' })],
    ['a network failure', async () => Promise.reject(new Error('offline'))],
  ])('fails on %s', async (_, fetchFn) => {
    const exit = await Effect.runPromiseExit(makeGitHubTokenFetch(fetchFn).exchange(INPUT))

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"exchange"')
  })
})

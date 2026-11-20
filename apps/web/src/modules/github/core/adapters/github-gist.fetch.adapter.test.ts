import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeGitHubGistFetch } from './github-gist.fetch.adapter.ts'

const API = 'https://api.github.example.com'

const rawGist = (files: Readonly<Record<string, { readonly content?: string; readonly truncated?: boolean }>>) => ({
  id: 'abc123',
  html_url: 'https://gist.github.example.com/abc123',
  files,
})

const fetchAnswering = (...responses: ReadonlyArray<Response>) => {
  const queue = [...responses]
  return vi.fn<typeof fetch>(async () => queue.shift() ?? new Response(null, { status: 500 }))
}

const jsonBodyOf = (init: RequestInit | undefined): unknown =>
  typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined

const DRAFT = { description: 'sample — Typika', isPublic: false, files: new Map([['src__main.ts', 'main']]) }

describe('makeGitHubGistFetch', () => {
  it('reads a gist anonymously', async () => {
    const fetchFn = fetchAnswering(Response.json(rawGist({ 'src__main.ts': { content: 'main' } })))

    const gist = await Effect.runPromise(makeGitHubGistFetch(API, fetchFn).get('abc123', undefined))

    expect(gist).toEqual({
      id: 'abc123',
      htmlUrl: 'https://gist.github.example.com/abc123',
      files: new Map([['src__main.ts', 'main']]),
      isTruncated: false,
    })
    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe(`${API}/gists/abc123`)
    expect(init?.headers).not.toHaveProperty('authorization')
  })

  it('flags a gist whose files GitHub truncated', async () => {
    const fetchFn = fetchAnswering(Response.json(rawGist({ 'big.txt': { content: 'start', truncated: true } })))

    const gist = await Effect.runPromise(makeGitHubGistFetch(API, fetchFn).get('abc123', undefined))

    expect(gist.isTruncated).toBe(true)
  })

  it.each([
    [404, {}, 'not-found'],
    [401, {}, 'unauthorized'],
    [403, { 'x-ratelimit-remaining': '0' }, 'rate-limited'],
    [429, {}, 'rate-limited'],
    [500, {}, 'unavailable'],
  ])('maps HTTP %i to a reason', async (status, headers, reason) => {
    const fetchFn = fetchAnswering(new Response(null, { status, headers }))

    const exit = await Effect.runPromiseExit(makeGitHubGistFetch(API, fetchFn).get('abc123', undefined))

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain(`"reason":"${reason}"`)
  })

  it('creates a secret gist with the token', async () => {
    const fetchFn = fetchAnswering(Response.json(rawGist({ 'src__main.ts': { content: 'main' } }), { status: 201 }))

    await Effect.runPromise(makeGitHubGistFetch(API, fetchFn).create('gho_test', DRAFT))

    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe(`${API}/gists`)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ authorization: 'Bearer gho_test' })
    expect(jsonBodyOf(init)).toEqual({
      description: 'sample — Typika',
      public: false,
      files: { 'src__main.ts': { content: 'main' } },
    })
  })

  it('replaces the files of a gist and deletes those the draft no longer has', async () => {
    const fetchFn = fetchAnswering(
      Response.json(rawGist({ 'src__main.ts': { content: 'old' }, 'src__gone.ts': { content: 'gone' } })),
      Response.json(rawGist({ 'src__main.ts': { content: 'main' } }))
    )

    await Effect.runPromise(makeGitHubGistFetch(API, fetchFn).replace('gho_test', 'abc123', DRAFT))

    const [url, init] = fetchFn.mock.calls[1] ?? []
    expect(url).toBe(`${API}/gists/abc123`)
    expect(init?.method).toBe('PATCH')
    expect(jsonBodyOf(init)).toEqual(
      expect.objectContaining({ files: { 'src__main.ts': { content: 'main' }, 'src__gone.ts': null } })
    )
  })
})

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeGitHubContentsFetch } from './github-contents.fetch.adapter.ts'

const API = 'https://api.github.example.com'
const REF = { owner: 'octocat', repo: 'patterns', path: 'strategy/ts' }

const base64 = (text: string) => btoa(String.fromCodePoint(...new TextEncoder().encode(text)))

const urlOf = (input: RequestInfo | URL | undefined) =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : (input?.url ?? '')

type Blob = { readonly path: string; readonly content: string; readonly size?: number }

const fakeGitHub = (blobs: ReadonlyArray<Blob>, { truncated = false } = {}) =>
  vi.fn<typeof fetch>(async (input) => {
    const url = urlOf(input)
    if (url.includes('/commits/')) return Response.json({ sha: '0123456789abcdef' })
    if (url.includes('/git/trees/'))
      return Response.json({
        truncated,
        tree: [
          { path: 'strategy', type: 'tree', sha: 'dir' },
          ...blobs.map((blob, index) => ({
            path: blob.path,
            type: 'blob',
            sha: `blob${index}`,
            size: blob.size ?? blob.content.length,
          })),
        ],
      })
    const index = Number(/blob(\d+)$/.exec(url)?.[1])
    const blob = blobs[index]
    return blob === undefined
      ? new Response(null, { status: 404 })
      : Response.json({ encoding: 'base64', content: `${base64(blob.content)}\n` })
  })

describe('makeGitHubContentsFetch', () => {
  it('reads the files of a folder at the commit its ref resolves to', async () => {
    const fetchFn = fakeGitHub([
      { path: 'strategy/ts/typika.toml', content: 'name = "strategy-ts"\n' },
      { path: 'strategy/ts/src/main.ts', content: "console.log('é')\n" },
      { path: 'observer/ts/typika.toml', content: 'name = "observer-ts"\n' },
    ])

    const folder = await Effect.runPromise(makeGitHubContentsFetch(API, fetchFn).readFolder(REF, 'token'))

    expect(folder.commit).toBe('0123456789abcdef')
    expect(Object.fromEntries(folder.files)).toEqual({
      'typika.toml': 'name = "strategy-ts"\n',
      'src/main.ts': "console.log('é')\n",
    })
    expect(urlOf(fetchFn.mock.calls[0]?.[0])).toBe(`${API}/repos/octocat/patterns/commits/HEAD`)
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer token' })
  })

  it('resolves the ref the user gave', async () => {
    const fetchFn = fakeGitHub([{ path: 'strategy/ts/typika.toml', content: '' }])

    await Effect.runPromise(makeGitHubContentsFetch(API, fetchFn).readFolder({ ...REF, ref: 'v1' }, undefined))

    expect(urlOf(fetchFn.mock.calls[0]?.[0])).toBe(`${API}/repos/octocat/patterns/commits/v1`)
  })

  it('fails for a folder without files', async () => {
    const exit = await Effect.runPromiseExit(
      makeGitHubContentsFetch(API, fakeGitHub([{ path: 'other/a.ts', content: '' }])).readFolder(REF, undefined)
    )

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({ error: { reason: 'not-found' } })
  })

  it.each([
    ['a tree GitHub truncated', fakeGitHub([{ path: 'strategy/ts/a.ts', content: '' }], { truncated: true })],
    ['a folder too large for a project', fakeGitHub([{ path: 'strategy/ts/a.ts', content: '', size: 5_000_000 }])],
  ])('fails for %s', async (_, fetchFn) => {
    const exit = await Effect.runPromiseExit(makeGitHubContentsFetch(API, fetchFn).readFolder(REF, undefined))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({ error: { reason: 'incomplete' } })
  })
})

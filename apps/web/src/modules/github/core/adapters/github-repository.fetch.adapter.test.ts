import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeGitHubRepositoryFetch } from './github-repository.fetch.adapter.ts'

const API = 'https://api.github.example.com'

const DRAFT = {
  name: 'strategy-remix',
  description: 'A remix',
  message: 'Initial commit from Typika',
  files: new Map([
    ['README.md', '# Remix'],
    ['src/main.ts', 'main'],
  ]),
}

const CREATED = Response.json(
  {
    full_name: 'octocat/strategy-remix',
    html_url: 'https://github.example.com/octocat/strategy-remix',
    default_branch: 'main',
  },
  { status: 201 }
)

const fetchAnswering = (...responses: ReadonlyArray<Response>) => {
  const queue = [...responses]
  return vi.fn<typeof fetch>(async () => queue.shift() ?? new Response(null, { status: 500 }))
}

const callsOf = (fetchFn: ReturnType<typeof fetchAnswering>) =>
  fetchFn.mock.calls.map(([url, init]) => ({
    url: typeof url === 'string' ? url.slice(API.length) : undefined,
    method: init?.method,
    body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
  }))

const create = (fetchFn: typeof fetch) =>
  Effect.runPromiseExit(makeGitHubRepositoryFetch(API, fetchFn, 0).create('gho_test', DRAFT))

describe('makeGitHubRepositoryFetch', () => {
  it('creates a public repository, then replaces its first commit by one commit holding the files', async () => {
    const fetchFn = fetchAnswering(
      CREATED.clone(),
      Response.json({ sha: 'tree-sha' }, { status: 201 }),
      Response.json({ sha: 'commit-sha' }, { status: 201 }),
      Response.json({ ref: 'refs/heads/main' })
    )

    const exit = await create(fetchFn)

    expect(exit).toEqual(
      Exit.succeed({
        fullName: 'octocat/strategy-remix',
        htmlUrl: 'https://github.example.com/octocat/strategy-remix',
      })
    )
    expect(callsOf(fetchFn)).toEqual([
      {
        url: '/user/repos',
        method: 'POST',
        body: { name: 'strategy-remix', description: 'A remix', private: false, auto_init: true },
      },
      {
        url: '/repos/octocat/strategy-remix/git/trees',
        method: 'POST',
        body: {
          tree: [
            { path: 'README.md', mode: '100644', type: 'blob', content: '# Remix' },
            { path: 'src/main.ts', mode: '100644', type: 'blob', content: 'main' },
          ],
        },
      },
      {
        url: '/repos/octocat/strategy-remix/git/commits',
        method: 'POST',
        body: { message: 'Initial commit from Typika', tree: 'tree-sha', parents: [] },
      },
      {
        url: '/repos/octocat/strategy-remix/git/refs/heads/main',
        method: 'PATCH',
        body: { sha: 'commit-sha', force: true },
      },
    ])
  })

  it('waits for a repository GitHub has not finished initializing', async () => {
    const fetchFn = fetchAnswering(
      CREATED.clone(),
      new Response(null, { status: 409 }),
      new Response(null, { status: 404 }),
      Response.json({ sha: 'tree-sha' }, { status: 201 }),
      Response.json({ sha: 'commit-sha' }, { status: 201 }),
      Response.json({ ref: 'refs/heads/main' })
    )

    expect(Exit.isSuccess(await create(fetchFn))).toBe(true)
  })

  it('reports a name GitHub refuses, without sending any file', async () => {
    const fetchFn = fetchAnswering(new Response(null, { status: 422 }))

    const exit = await create(fetchFn)

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"name-taken"')
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('reports a session without the right to create a repository', async () => {
    const exit = await create(fetchAnswering(new Response(null, { status: 403 })))

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"unauthorized"')
  })

  it('says the repository exists without its files when the commit fails', async () => {
    const fetchFn = fetchAnswering(
      CREATED.clone(),
      Response.json({ sha: 'tree-sha' }, { status: 201 }),
      new Response(null, { status: 500 })
    )

    const exit = await create(fetchFn)

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"incomplete"')
  })
})

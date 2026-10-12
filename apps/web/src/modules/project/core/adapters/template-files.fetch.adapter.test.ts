import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { makeTemplateFilesFetch } from './template-files.fetch.adapter.ts'

const URLS = {
  fileUrlTemplate: 'https://cdn.example.com/gh/{owner}/{repo}@{ref}/{path}',
  listingUrlTemplate: 'https://data.example.com/v1/packages/gh/{owner}/{repo}@{ref}?structure=flat',
}
const REF = 'github:typika/templates/strategy/ts@0123456789ab'
const LISTING = 'https://data.example.com/v1/packages/gh/typika/templates@0123456789ab?structure=flat'
const FILE = 'https://cdn.example.com/gh/typika/templates@0123456789ab/'

const urlOf = (input: RequestInfo | URL) => (input instanceof Request ? input.url : input.toString())

const makeServer = (responses: Readonly<Record<string, BodyInit | Error>>) =>
  vi.fn<typeof fetch>(async (input) => {
    const body = responses[urlOf(input)]
    if (body instanceof Error) throw body
    return body === undefined ? new Response('Not found', { status: 404 }) : new Response(body)
  })

const REPOSITORY = {
  [LISTING]: JSON.stringify({
    type: 'gh',
    name: 'typika/templates',
    version: '0123456789ab',
    default: null,
    files: [
      { name: '/strategy/ts/typika.toml', hash: 'a', size: 1 },
      { name: '/strategy/ts/src/main.ts', hash: 'b', size: 1 },
      { name: '/strategy/ts/tour/diagram.png', hash: 'c', size: 1 },
      { name: '/strategy-base/ts/typika.toml', hash: 'd', size: 1 },
    ],
  }),
  [`${FILE}strategy/ts/typika.toml`]: 'name = "strategy-ts"\n',
  [`${FILE}strategy/ts/src/main.ts`]: 'main\n',
  [`${FILE}strategy/ts/tour/diagram.png`]: new Uint8Array([0x89, 0, 1]),
  [`${FILE}strategy-base/ts/typika.toml`]: 'name = "strategy-base-ts"\n',
}

const failureOf = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && exit.cause.reasons[0]

describe('makeTemplateFilesFetch', () => {
  it('downloads the files of the template folder at its pinned commit', async () => {
    const files = await Effect.runPromise(makeTemplateFilesFetch(URLS, makeServer(REPOSITORY)).load(REF))

    expect(Object.fromEntries(files)).toEqual({
      'typika.toml': 'name = "strategy-ts"\n',
      'src/main.ts': 'main\n',
      'tour/diagram.png': new Uint8Array([0x89, 0, 1]),
    })
  })

  it('downloads a ref once', async () => {
    const server = makeServer(REPOSITORY)
    const source = makeTemplateFilesFetch(URLS, server)

    await Effect.runPromise(source.load(REF))
    await Effect.runPromise(source.load(REF))

    expect(server).toHaveBeenCalledTimes(4)
  })

  it('fails when a file cannot be downloaded, then tries again', async () => {
    const server = makeServer({ ...REPOSITORY, [`${FILE}strategy/ts/src/main.ts`]: new TypeError('Failed to fetch') })
    const source = makeTemplateFilesFetch(URLS, server)

    expect(failureOf(await Effect.runPromiseExit(source.load(REF)))).toMatchObject({
      error: { _tag: 'ProjectFilesUnavailableError', ref: REF },
    })
    await Effect.runPromiseExit(source.load(REF))
    expect(server.mock.calls.filter(([url]) => urlOf(url) === LISTING)).toHaveLength(2)
  })

  it.each([
    ['the ref is not pinned', 'github:typika/templates/strategy/ts'],
    ['nothing exists at the ref', 'github:typika/templates/observer/ts@0123456789ab'],
    ['the commit is unknown', 'github:typika/templates/strategy/ts@ba9876543210'],
  ])('fails when %s', async (_, ref) => {
    const exit = await Effect.runPromiseExit(makeTemplateFilesFetch(URLS, makeServer(REPOSITORY)).load(ref))

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectFilesUnavailableError', ref } })
  })
})

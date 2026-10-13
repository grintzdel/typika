import { KotlinCompilerRateLimitedError, KotlinCompilerUnavailableError } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import { describe, expect, it, vi } from 'vitest'

import { KotlinCompileMode } from '../domain/constants/kotlin-compile-mode.constant.ts'
import { makeMemoryCompileCache } from '../memory-compile-cache/memory-compile-cache.ts'
import { makeKotlinCompilerClient } from './kotlin-compiler-client.ts'

const FILES = [{ path: 'src/main/kotlin/Main.kt', content: 'fun main() {}' }]
const ARTIFACT = { kind: 'js', code: 'main()', sourceMap: '{"version":3}' } as const

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const clientAnswering = (...responses: Array<Response | Error>) => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  for (const response of responses) {
    if (response instanceof Error) fetch.mockRejectedValueOnce(response)
    else fetch.mockResolvedValueOnce(response)
  }
  return { fetch, client: makeKotlinCompilerClient({ url: 'http://compiler.test/', fetch }) }
}

const compileExit = (client: ReturnType<typeof makeKotlinCompilerClient>, files = FILES) =>
  Effect.runPromiseExit(client.compile(KotlinCompileMode.TEST, files))

const errorOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit) ? Option.getOrUndefined(Cause.findErrorOption(exit.cause)) : undefined

describe('makeKotlinCompilerClient', () => {
  it('posts the protocol 1 request for the JS target to /compile', async () => {
    const { fetch, client } = clientAnswering(json(200, { ok: true, artifact: ARTIFACT, diagnostics: [] }))

    await compileExit(client)

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('http://compiler.test/compile')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(typeof init?.body === 'string' ? init.body : '')).toEqual({
      protocol: 1,
      target: 'js',
      kotlinVersion: '2.4',
      mode: 'test',
      files: FILES,
    })
  })

  it('returns the artifact and the warnings of a compilation', async () => {
    const warning = { severity: 'warning', message: 'unused variable', location: { file: 'a.kt', line: 1 } }
    const { client } = clientAnswering(json(200, { ok: true, artifact: ARTIFACT, diagnostics: [warning] }))

    expect(await compileExit(client)).toEqual(
      Exit.succeed({ _tag: 'Compiled', artifact: ARTIFACT, diagnostics: [warning] })
    )
  })

  it('returns the diagnostics of a failed compilation', async () => {
    const error = { severity: 'error', message: 'type mismatch', location: { file: 'a.kt', line: 2, column: 5 } }
    const { client } = clientAnswering(json(200, { ok: false, diagnostics: [error] }))

    expect(await compileExit(client)).toEqual(Exit.succeed({ _tag: 'Failed', diagnostics: [error] }))
  })

  it('answers the same sources from its cache without calling the service again', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      json(200, { ok: true, artifact: ARTIFACT, diagnostics: [] })
    )
    const client = makeKotlinCompilerClient({ url: 'http://compiler.test', fetch, cache: makeMemoryCompileCache(1e6) })

    await compileExit(client)
    const second = await compileExit(client)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(Exit.isSuccess(second)).toBe(true)
  })

  it('fails a project over 256 KiB without calling the service', async () => {
    const { fetch, client } = clientAnswering()
    const big = [{ path: 'src/main/kotlin/Big.kt', content: 'a'.repeat(256 * 1024) }]

    const exit = await compileExit(client, big)

    expect(fetch).not.toHaveBeenCalled()
    expect(exit).toEqual(
      Exit.succeed({
        _tag: 'Failed',
        diagnostics: [{ severity: 'error', message: 'The project is too large to compile: over 256 KiB of sources.' }],
      })
    )
  })

  it('reports a 413 as a project too large to compile', async () => {
    const { client } = clientAnswering(json(413, { error: 'request body over 256 KiB' }))

    expect(await compileExit(client)).toEqual(
      Exit.succeed({
        _tag: 'Failed',
        diagnostics: [{ severity: 'error', message: 'The project is too large to compile: over 256 KiB of sources.' }],
      })
    )
  })

  it('reports a 429 with the delay of its Retry-After header', async () => {
    const { client } = clientAnswering(json(429, { error: 'slow down' }, { 'retry-after': '12' }))

    expect(errorOf(await compileExit(client))).toEqual(new KotlinCompilerRateLimitedError({ retryAfterSeconds: 12 }))
  })

  it.each([
    [400, 'unsupported protocol'],
    [503, 'compilation queue is full'],
    [504, 'compilation timed out after 15000 ms'],
  ])('reports a %i as an unavailable compiler', async (status, error) => {
    const { client } = clientAnswering(json(status, { error }))

    expect(errorOf(await compileExit(client))).toEqual(
      new KotlinCompilerUnavailableError({ cause: `HTTP ${status}: ${error}` })
    )
  })

  it('reports a network failure as an unavailable compiler', async () => {
    const failure = new TypeError('Failed to fetch')
    const { client } = clientAnswering(failure)

    expect(errorOf(await compileExit(client))).toEqual(new KotlinCompilerUnavailableError({ cause: failure }))
  })

  it('reports a malformed answer as an unavailable compiler', async () => {
    const { client } = clientAnswering(json(200, { ok: 'yes' }))

    expect(errorOf(await compileExit(client))).toMatchObject({ _tag: 'KotlinCompilerUnavailableError' })
  })

  it('gives up on a compilation that outlasts its timeout', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        })
    )
    const client = makeKotlinCompilerClient({ url: 'http://compiler.test', fetch, timeoutMs: 20 })

    expect(errorOf(await compileExit(client))).toMatchObject({ _tag: 'KotlinCompilerUnavailableError' })
  })
})

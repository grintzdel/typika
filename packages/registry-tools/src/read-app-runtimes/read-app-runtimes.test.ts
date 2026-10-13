import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { readAppRuntimes } from './read-app-runtimes.ts'

const APP = 'http://localhost:3000'

const fetchAnswering = (response: Response) => vi.fn(async (_url: string) => response)

describe('readAppRuntimes', () => {
  it('reads Kotlin from the public config of an app that has a compiler', async () => {
    const fetch = fetchAnswering(Response.json({ kotlinCompilerUrl: '/api/kotlin' }))

    const runtimes = await Effect.runPromise(readAppRuntimes(`${APP}/`, fetch))

    expect(fetch).toHaveBeenCalledWith(`${APP}/config.json`)
    expect([...runtimes]).toEqual(['browser-js', 'go', 'kotlin'])
  })

  it('leaves Kotlin out when the app has no compiler', async () => {
    const runtimes = await Effect.runPromise(readAppRuntimes(APP, fetchAnswering(Response.json({}))))

    expect([...runtimes]).toEqual(['browser-js', 'go'])
  })

  it('fails when the app does not serve its config', async () => {
    const exit = await Effect.runPromiseExit(readAppRuntimes(APP, fetchAnswering(new Response('', { status: 404 }))))

    expect(Exit.isFailure(exit)).toBe(true)
  })
})

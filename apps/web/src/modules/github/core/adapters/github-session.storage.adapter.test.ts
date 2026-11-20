import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import { describe, expect, it } from 'vitest'

import { makeGitHubSessionStorage } from './github-session.storage.adapter.ts'

const memoryStorage = (initial: Readonly<Record<string, string>> = {}) => {
  const items = new Map(Object.entries(initial))
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

const refuse = () => {
  throw new Error('SecurityError')
}

const SESSION = { accessToken: 'gho_test', scopes: ['gist'] }
const PENDING = { state: 's', codeVerifier: 'v', returnTo: '/play/strategy-ts' }

describe('makeGitHubSessionStorage', () => {
  it('keeps the session until it is cleared', () => {
    const sessions = makeGitHubSessionStorage(memoryStorage())

    Effect.runSync(sessions.save(SESSION))
    expect(Effect.runSync(sessions.session)).toEqual(Option.some(SESSION))

    Effect.runSync(sessions.clear)
    expect(Effect.runSync(sessions.session)).toEqual(Option.none())
  })

  it('keeps the sign-in in progress apart from the session', () => {
    const storage = memoryStorage()
    const sessions = makeGitHubSessionStorage(storage)

    Effect.runSync(sessions.savePending(PENDING))

    expect(Effect.runSync(sessions.pending)).toEqual(Option.some(PENDING))
    expect(Effect.runSync(sessions.session)).toEqual(Option.none())
    Effect.runSync(sessions.clearPending)
    expect(storage.items.size).toBe(0)
  })

  it('reads a stored value of another shape as no session', () => {
    const sessions = makeGitHubSessionStorage(memoryStorage({ 'typika:github:session': '{"accessToken":1}' }))

    expect(Effect.runSync(sessions.session)).toEqual(Option.none())
  })

  it('works without a usable storage, with no session', () => {
    const sessions = makeGitHubSessionStorage({ getItem: refuse, setItem: refuse, removeItem: refuse })

    Effect.runSync(sessions.save(SESSION))
    Effect.runSync(sessions.clear)

    expect(Effect.runSync(sessions.session)).toEqual(Option.none())
  })
})

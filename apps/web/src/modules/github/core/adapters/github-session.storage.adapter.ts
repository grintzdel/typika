import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import { GitHubSessionSchema, PendingAuthorizationSchema } from '../domain/github-oauth.domain-model.ts'
import { GitHubSessionPort } from '../ports/github-session.port.ts'

const SESSION_KEY = 'typika:github:session'
const PENDING_KEY = 'typika:github:pending'

type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const decodeSession = Schema.decodeUnknownOption(Schema.fromJsonString(GitHubSessionSchema))
const decodePending = Schema.decodeUnknownOption(Schema.fromJsonString(PendingAuthorizationSchema))

export const makeGitHubSessionStorage = (storage: SessionStorage): Context.Service.Shape<typeof GitHubSessionPort> => {
  const read = (key: string) => {
    try {
      return storage.getItem(key)
    } catch {
      return null
    }
  }
  const write = (key: string, value: unknown) =>
    Effect.sync(() => {
      try {
        storage.setItem(key, JSON.stringify(value))
      } catch {
        // Without sessionStorage, the sign-in does not survive the round trip to GitHub.
      }
    })
  const remove = (key: string) =>
    Effect.sync(() => {
      try {
        storage.removeItem(key)
      } catch {
        return
      }
    })

  return {
    session: Effect.sync(() => decodeSession(read(SESSION_KEY))),
    save: (session) => write(SESSION_KEY, session),
    clear: remove(SESSION_KEY),
    pending: Effect.sync(() => decodePending(read(PENDING_KEY))),
    savePending: (pending) => write(PENDING_KEY, pending),
    clearPending: remove(PENDING_KEY),
  }
}

export const GitHubSessionStorageLayer = Layer.sync(GitHubSessionPort, () =>
  makeGitHubSessionStorage(
    typeof sessionStorage === 'undefined'
      ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
      : sessionStorage
  )
)

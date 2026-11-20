import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'

import type { GitHubSession, PendingAuthorization } from '../domain/github-oauth.domain-model.ts'

export class GitHubSessionPort extends Context.Service<
  GitHubSessionPort,
  {
    readonly session: Effect.Effect<Option.Option<GitHubSession>>
    readonly save: (session: GitHubSession) => Effect.Effect<void>
    readonly clear: Effect.Effect<void>
    readonly pending: Effect.Effect<Option.Option<PendingAuthorization>>
    readonly savePending: (pending: PendingAuthorization) => Effect.Effect<void>
    readonly clearPending: Effect.Effect<void>
  }
>()('@typika/web/GitHubSessionPort') {}

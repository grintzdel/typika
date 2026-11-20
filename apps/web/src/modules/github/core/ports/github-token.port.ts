import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { GitHubAuthorizationError } from '../domain/errors/github-authorization.error.ts'
import type { GitHubSession } from '../domain/github-oauth.domain-model.ts'

export class GitHubTokenPort extends Context.Service<
  GitHubTokenPort,
  {
    readonly exchange: (input: {
      readonly code: string
      readonly codeVerifier: string
    }) => Effect.Effect<GitHubSession, GitHubAuthorizationError>
  }
>()('@typika/web/GitHubTokenPort') {}

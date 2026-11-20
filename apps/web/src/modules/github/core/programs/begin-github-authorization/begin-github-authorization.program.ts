import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { AppConfig } from '../../../../shared/core/ports/app-config.port.ts'
import { GitHubAuthorizationError } from '../../domain/errors/github-authorization.error.ts'
import {
  authorizeUrlOf,
  codeChallengeOf,
  randomToken,
  returnPathOf,
  type GitHubScope,
} from '../../domain/github-oauth.domain-model.ts'
import { GitHubSessionPort } from '../../ports/github-session.port.ts'

export const beginGitHubAuthorizationProgram = ({
  scopes,
  returnTo,
  appOrigin,
}: {
  readonly scopes: ReadonlyArray<GitHubScope>
  readonly returnTo: string
  readonly appOrigin: string
}) =>
  Effect.gen(function* () {
    const { github } = yield* AppConfig
    if (github === undefined) return yield* new GitHubAuthorizationError({ reason: 'disabled' })
    const sessions = yield* GitHubSessionPort
    const granted = Option.match(yield* sessions.session, { onNone: () => [], onSome: (session) => session.scopes })
    const state = yield* Effect.sync(randomToken)
    const codeVerifier = yield* Effect.sync(randomToken)
    yield* sessions.savePending({ state, codeVerifier, returnTo: returnPathOf(returnTo) })
    return authorizeUrlOf({
      githubUrl: github.url,
      clientId: github.clientId,
      appOrigin,
      scopes: [...new Set([...granted, ...scopes])],
      state,
      codeChallenge: yield* codeChallengeOf(codeVerifier),
    })
  })

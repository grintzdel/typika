import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { GitHubAuthorizationError } from '../../domain/errors/github-authorization.error.ts'
import { GitHubSessionPort } from '../../ports/github-session.port.ts'
import { GitHubTokenPort } from '../../ports/github-token.port.ts'

export const completeGitHubAuthorizationProgram = ({
  code,
  state,
}: {
  readonly code: string | undefined
  readonly state: string | undefined
}) =>
  Effect.gen(function* () {
    const sessions = yield* GitHubSessionPort
    const tokens = yield* GitHubTokenPort
    const pending = yield* sessions.pending
    yield* sessions.clearPending
    if (Option.isNone(pending) || state !== pending.value.state)
      return yield* new GitHubAuthorizationError({ reason: 'state' })
    if (code === undefined) return yield* new GitHubAuthorizationError({ reason: 'denied' })
    yield* sessions.save(yield* tokens.exchange({ code, codeVerifier: pending.value.codeVerifier }))
    return pending.value.returnTo
  })

import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { AppConfig } from '../../../../shared/core/ports/app-config.port.ts'
import { GITHUB_REVOKE_PATH, type GitHubStatus } from '../../domain/github-oauth.domain-model.ts'
import { GitHubSessionPort } from '../../ports/github-session.port.ts'

export const readGitHubStatusProgram = Effect.gen(function* () {
  const { github } = yield* AppConfig
  const sessions = yield* GitHubSessionPort
  const session = yield* sessions.session
  return {
    isEnabled: github !== undefined,
    isConnected: Option.isSome(session),
    scopes: Option.match(session, { onNone: () => [], onSome: ({ scopes }) => scopes }),
    revokeUrl: github === undefined ? undefined : `${github.url}${GITHUB_REVOKE_PATH}`,
  } satisfies GitHubStatus
})

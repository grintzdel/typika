import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import { GitHubAuthorizationError } from '../domain/errors/github-authorization.error.ts'
import { GITHUB_TOKEN_PATH, GitHubSessionSchema } from '../domain/github-oauth.domain-model.ts'
import { GitHubTokenPort } from '../ports/github-token.port.ts'

export const makeGitHubTokenFetch = (
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof GitHubTokenPort> => ({
  exchange: (input) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetchFn(GITHUB_TOKEN_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as unknown
      },
      catch: () => new GitHubAuthorizationError({ reason: 'exchange' }),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(GitHubSessionSchema)),
      Effect.mapError(() => new GitHubAuthorizationError({ reason: 'exchange' }))
    ),
})

export const GitHubTokenFetchLayer = Layer.sync(GitHubTokenPort, () => makeGitHubTokenFetch())

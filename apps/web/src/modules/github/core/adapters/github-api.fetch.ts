import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { GitHubApiError } from '../domain/errors/github-api.error.ts'

const reasonOf = (response: Response): GitHubApiError['reason'] => {
  if (response.status === 401) return 'unauthorized'
  if (response.status === 404) return 'not-found'
  if (response.status === 409) return 'conflict'
  if (response.status === 422) return 'unprocessable'
  if (response.status === 429) return 'rate-limited'
  if (response.status === 403)
    return response.headers.get('x-ratelimit-remaining') === '0' ? 'rate-limited' : 'unauthorized'
  return 'unavailable'
}

export type GitHubApiCall = <A, I>(
  schema: Schema.Codec<A, I>,
  path: string,
  accessToken: string | undefined,
  init?: { readonly method: string; readonly body: unknown }
) => Effect.Effect<A, GitHubApiError>

export const makeGitHubApiCall =
  (apiUrl: string, fetchFn: typeof fetch): GitHubApiCall =>
  (schema, path, accessToken, init) =>
    Effect.tryPromise({
      try: () =>
        fetchFn(`${apiUrl}${path}`, {
          ...(init === undefined ? {} : { method: init.method, body: JSON.stringify(init.body) }),
          headers: {
            accept: 'application/vnd.github+json',
            ...(init === undefined ? {} : { 'content-type': 'application/json' }),
            ...(accessToken === undefined ? {} : { authorization: `Bearer ${accessToken}` }),
          },
        }),
      catch: () => new GitHubApiError({ reason: 'unavailable' }),
    }).pipe(
      Effect.flatMap((response) =>
        response.ok
          ? Effect.tryPromise({
              try: async () => (await response.json()) as unknown,
              catch: () => new GitHubApiError({ reason: 'invalid' }),
            })
          : Effect.fail(new GitHubApiError({ reason: reasonOf(response) }))
      ),
      Effect.flatMap((body) =>
        Option.match(Schema.decodeUnknownOption(schema)(body), {
          onNone: () => Effect.fail(new GitHubApiError({ reason: 'invalid' })),
          onSome: (value) => Effect.succeed(value),
        })
      )
    )

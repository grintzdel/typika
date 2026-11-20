import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { DEFAULT_GITHUB_API_URL } from '../../../shared/core/public-config/public-config-from-env.ts'
import { GitHubApiError } from '../domain/errors/github-api.error.ts'
import { gistOf, GistSchema, type Gist, type GistDraft } from '../domain/gist.domain-model.ts'
import { GitHubGistPort } from '../ports/github-gist.port.ts'

const decodeGist = Schema.decodeUnknownOption(GistSchema)

const reasonOf = (response: Response): GitHubApiError['reason'] => {
  if (response.status === 401) return 'unauthorized'
  if (response.status === 404) return 'not-found'
  if (response.status === 429) return 'rate-limited'
  if (response.status === 403)
    return response.headers.get('x-ratelimit-remaining') === '0' ? 'rate-limited' : 'unauthorized'
  return 'unavailable'
}

const contentOf = (files: ReadonlyMap<string, string>) =>
  Object.fromEntries([...files].map(([name, content]) => [name, { content }]))

const bodyOf = (draft: GistDraft, files: Readonly<Record<string, { readonly content: string } | null>>) =>
  JSON.stringify({ description: draft.description, public: draft.isPublic, files })

export const makeGitHubGistFetch = (
  apiUrl: string,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof GitHubGistPort> => {
  const call = (path: string, accessToken: string | undefined, init: RequestInit = {}) =>
    Effect.tryPromise({
      try: () =>
        fetchFn(`${apiUrl}${path}`, {
          ...init,
          headers: {
            accept: 'application/vnd.github+json',
            ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
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
        Option.match(decodeGist(body), {
          onNone: () => Effect.fail(new GitHubApiError({ reason: 'invalid' })),
          onSome: (gist) => Effect.succeed(gistOf(gist)),
        })
      )
    )

  const get = (id: string, accessToken: string | undefined): Effect.Effect<Gist, GitHubApiError> =>
    call(`/gists/${encodeURIComponent(id)}`, accessToken)

  return {
    get,
    create: (accessToken, draft) =>
      call('/gists', accessToken, { method: 'POST', body: bodyOf(draft, contentOf(draft.files)) }),
    replace: (accessToken, id, draft) =>
      Effect.flatMap(get(id, accessToken), (current) =>
        call(`/gists/${encodeURIComponent(id)}`, accessToken, {
          method: 'PATCH',
          body: bodyOf(draft, {
            ...Object.fromEntries([...current.files.keys()].map((name) => [name, null])),
            ...contentOf(draft.files),
          }),
        })
      ),
  }
}

export const GitHubGistFetchLayer = Layer.effect(
  GitHubGistPort,
  Effect.map(AppConfig, (config) => makeGitHubGistFetch(config.github?.apiUrl ?? DEFAULT_GITHUB_API_URL))
)

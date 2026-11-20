import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { DEFAULT_GITHUB_API_URL } from '../../../shared/core/public-config/public-config-from-env.ts'
import { gistOf, GistSchema, type GistDraft } from '../domain/gist.domain-model.ts'
import { GitHubGistPort } from '../ports/github-gist.port.ts'
import { makeGitHubApiCall } from './github-api.fetch.ts'

const contentOf = (files: ReadonlyMap<string, string>) =>
  Object.fromEntries([...files].map(([name, content]) => [name, { content }]))

const bodyOf = (draft: GistDraft, files: Readonly<Record<string, { readonly content: string } | null>>) => ({
  description: draft.description,
  public: draft.isPublic,
  files,
})

export const makeGitHubGistFetch = (
  apiUrl: string,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof GitHubGistPort> => {
  const call = makeGitHubApiCall(apiUrl, fetchFn)
  const get = (id: string, accessToken: string | undefined) =>
    Effect.map(call(GistSchema, `/gists/${encodeURIComponent(id)}`, accessToken), gistOf)

  return {
    get,
    create: (accessToken, draft) =>
      Effect.map(
        call(GistSchema, '/gists', accessToken, { method: 'POST', body: bodyOf(draft, contentOf(draft.files)) }),
        gistOf
      ),
    replace: (accessToken, id, draft) =>
      Effect.flatMap(get(id, accessToken), (current) =>
        Effect.map(
          call(GistSchema, `/gists/${encodeURIComponent(id)}`, accessToken, {
            method: 'PATCH',
            body: bodyOf(draft, {
              ...Object.fromEntries([...current.files.keys()].map((name) => [name, null])),
              ...contentOf(draft.files),
            }),
          }),
          gistOf
        )
      ),
  }
}

export const GitHubGistFetchLayer = Layer.effect(
  GitHubGistPort,
  Effect.map(AppConfig, (config) => makeGitHubGistFetch(config.github?.apiUrl ?? DEFAULT_GITHUB_API_URL))
)

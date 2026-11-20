import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schedule from 'effect/Schedule'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { DEFAULT_GITHUB_API_URL } from '../../../shared/core/public-config/public-config-from-env.ts'
import { GitHubApiError } from '../domain/errors/github-api.error.ts'
import { CreatedRepositorySchema, GitObjectSchema, GitRefSchema } from '../domain/repository.domain-model.ts'
import { GitHubRepositoryPort } from '../ports/github-repository.port.ts'
import { makeGitHubApiCall } from './github-api.fetch.ts'

const FILE_MODE = '100644'
const NOT_READY: ReadonlySet<GitHubApiError['reason']> = new Set(['not-found', 'conflict'])

export const makeGitHubRepositoryFetch = (
  apiUrl: string,
  fetchFn: typeof fetch = globalThis.fetch,
  retryDelayMs = 500
): Context.Service.Shape<typeof GitHubRepositoryPort> => {
  const call = makeGitHubApiCall(apiUrl, fetchFn)
  return {
    create: (accessToken, draft) =>
      Effect.gen(function* () {
        // The Git Data API refuses an empty repository: `auto_init` makes a first commit, replaced below.
        const repository = yield* call(CreatedRepositorySchema, '/user/repos', accessToken, {
          method: 'POST',
          body: { name: draft.name, description: draft.description, private: false, auto_init: true },
        }).pipe(
          Effect.mapError((error) =>
            error.reason === 'unprocessable' ? new GitHubApiError({ reason: 'name-taken' }) : error
          )
        )
        const git = `/repos/${repository.full_name}/git`
        const commit = Effect.gen(function* () {
          const tree = yield* call(GitObjectSchema, `${git}/trees`, accessToken, {
            method: 'POST',
            body: {
              tree: [...draft.files].map(([path, content]) => ({ path, mode: FILE_MODE, type: 'blob', content })),
            },
          }).pipe(
            Effect.retry({
              while: (error) => NOT_READY.has(error.reason),
              schedule: Schedule.spaced(retryDelayMs),
              times: 5,
            })
          )
          const created = yield* call(GitObjectSchema, `${git}/commits`, accessToken, {
            method: 'POST',
            body: { message: draft.message, tree: tree.sha, parents: [] },
          })
          yield* call(GitRefSchema, `${git}/refs/heads/${repository.default_branch}`, accessToken, {
            method: 'PATCH',
            body: { sha: created.sha, force: true },
          })
        })
        yield* commit.pipe(
          Effect.mapError((error) =>
            error.reason === 'unauthorized' || error.reason === 'rate-limited'
              ? error
              : new GitHubApiError({ reason: 'incomplete' })
          )
        )
        return { fullName: repository.full_name, htmlUrl: repository.html_url }
      }),
  }
}

export const GitHubRepositoryFetchLayer = Layer.effect(
  GitHubRepositoryPort,
  Effect.map(AppConfig, (config) => makeGitHubRepositoryFetch(config.github?.apiUrl ?? DEFAULT_GITHUB_API_URL))
)

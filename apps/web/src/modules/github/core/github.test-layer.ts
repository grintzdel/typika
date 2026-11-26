import type { TemplateRef } from '@typika/manifest'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import type { PublicConfig } from '../../shared/core/domain/public-config.domain-model.ts'
import { AppConfig } from '../../shared/core/ports/app-config.port.ts'
import { GitHubApiError } from './domain/errors/github-api.error.ts'
import type { Gist, GistDraft } from './domain/gist.domain-model.ts'
import type { GitHubSession, PendingAuthorization } from './domain/github-oauth.domain-model.ts'
import type { RepositoryDraft } from './domain/repository.domain-model.ts'
import { GitHubContentsPort, type GitHubFolder } from './ports/github-contents.port.ts'
import { GitHubGistPort } from './ports/github-gist.port.ts'
import { GitHubRepositoryPort } from './ports/github-repository.port.ts'
import { GitHubSessionPort } from './ports/github-session.port.ts'
import { GitHubTokenPort } from './ports/github-token.port.ts'

export const GITHUB_TEST_CONFIG: PublicConfig = {
  publicUrl: 'https://typika.example.org',
  runtimeOrigin: 'https://typika-run.example.net',
  registryIndexUrl: '/registry/index.json',
  templateFileUrlTemplate: '/registry/gh/{owner}/{repo}@{ref}/{path}',
  templateListingUrlTemplate: '/registry/listing/gh/{owner}/{repo}@{ref}.json',
  github: { clientId: 'client-id', url: 'https://github.example.com', apiUrl: 'https://api.github.example.com' },
}

export const TEST_GITHUB_SESSION: GitHubSession = { accessToken: 'gho_test', scopes: ['gist'] }

export type InMemoryGitHubSessions = Context.Service.Shape<typeof GitHubSessionPort> & {
  readonly current: () => GitHubSession | undefined
  readonly currentPending: () => PendingAuthorization | undefined
}

export const makeGitHubSessionsInMemory = (
  initial: {
    readonly session?: GitHubSession
    readonly pending?: PendingAuthorization
  } = {}
): InMemoryGitHubSessions => {
  let session = initial.session
  let pending = initial.pending
  return {
    session: Effect.sync(() => Option.fromNullishOr(session)),
    save: (next) =>
      Effect.sync(() => {
        session = next
      }),
    clear: Effect.sync(() => {
      session = undefined
    }),
    pending: Effect.sync(() => Option.fromNullishOr(pending)),
    savePending: (next) =>
      Effect.sync(() => {
        pending = next
      }),
    clearPending: Effect.sync(() => {
      pending = undefined
    }),
    current: () => session,
    currentPending: () => pending,
  }
}

export type InMemoryGists = Context.Service.Shape<typeof GitHubGistPort> & {
  readonly gists: ReadonlyMap<string, Gist>
  readonly drafts: ReadonlyMap<string, GistDraft>
}

export const makeGistsInMemory = (initial: ReadonlyArray<Gist> = []): InMemoryGists => {
  const gists = new Map(initial.map((gist) => [gist.id, gist]))
  const drafts = new Map<string, GistDraft>()
  const store = (id: string, draft: GistDraft) => {
    const gist = {
      id,
      htmlUrl: `https://gist.github.example.com/${id}`,
      files: new Map(draft.files),
      isTruncated: false,
    }
    gists.set(id, gist)
    drafts.set(id, draft)
    return gist
  }
  return {
    get: (id) => {
      const gist = gists.get(id)
      return gist === undefined ? Effect.fail(new GitHubApiError({ reason: 'not-found' })) : Effect.succeed(gist)
    },
    create: (_, draft) => Effect.sync(() => store(`gist${gists.size + 1}`, draft)),
    replace: (_, id, draft) =>
      gists.has(id) ? Effect.sync(() => store(id, draft)) : Effect.fail(new GitHubApiError({ reason: 'not-found' })),
    gists,
    drafts,
  }
}

export type InMemoryRepositories = Context.Service.Shape<typeof GitHubRepositoryPort> & {
  readonly drafts: ReadonlyMap<string, RepositoryDraft>
}

export const makeRepositoriesInMemory = (owner = 'octocat'): InMemoryRepositories => {
  const drafts = new Map<string, RepositoryDraft>()
  return {
    create: (_, draft) => {
      if (drafts.has(draft.name)) return Effect.fail(new GitHubApiError({ reason: 'name-taken' }))
      drafts.set(draft.name, draft)
      return Effect.succeed({
        fullName: `${owner}/${draft.name}`,
        htmlUrl: `https://github.example.com/${owner}/${draft.name}`,
      })
    },
    drafts,
  }
}

export type InMemoryContents = Context.Service.Shape<typeof GitHubContentsPort> & {
  readonly requests: ReadonlyArray<{ readonly ref: TemplateRef; readonly accessToken: string | undefined }>
}

export const makeContentsInMemory = (
  folders: Readonly<Record<string, GitHubFolder>> = {},
  failure?: GitHubApiError
): InMemoryContents => {
  const requests: Array<{ readonly ref: TemplateRef; readonly accessToken: string | undefined }> = []
  return {
    readFolder: (ref, accessToken) => {
      requests.push({ ref, accessToken })
      const folder = folders[`${ref.owner}/${ref.repo}/${ref.path ?? ''}`]
      if (failure !== undefined) return Effect.fail(failure)
      return folder === undefined ? Effect.fail(new GitHubApiError({ reason: 'not-found' })) : Effect.succeed(folder)
    },
    requests,
  }
}

export const makeGitHubTestLayer = ({
  config = GITHUB_TEST_CONFIG,
  sessions = makeGitHubSessionsInMemory(),
  gists = makeGistsInMemory(),
  repositories = makeRepositoriesInMemory(),
  contents = makeContentsInMemory(),
  exchange = () => Effect.succeed(TEST_GITHUB_SESSION),
}: {
  readonly config?: PublicConfig
  readonly sessions?: Context.Service.Shape<typeof GitHubSessionPort>
  readonly gists?: Context.Service.Shape<typeof GitHubGistPort>
  readonly repositories?: Context.Service.Shape<typeof GitHubRepositoryPort>
  readonly contents?: Context.Service.Shape<typeof GitHubContentsPort>
  readonly exchange?: Context.Service.Shape<typeof GitHubTokenPort>['exchange']
} = {}) =>
  Layer.mergeAll(
    Layer.succeed(AppConfig, config),
    Layer.succeed(GitHubSessionPort, sessions),
    Layer.succeed(GitHubGistPort, gists),
    Layer.succeed(GitHubRepositoryPort, repositories),
    Layer.succeed(GitHubContentsPort, contents),
    Layer.succeed(GitHubTokenPort, { exchange })
  )

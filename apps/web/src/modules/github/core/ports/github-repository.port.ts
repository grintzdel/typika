import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { GitHubApiError } from '../domain/errors/github-api.error.ts'
import type { Repository, RepositoryDraft } from '../domain/repository.domain-model.ts'

export class GitHubRepositoryPort extends Context.Service<
  GitHubRepositoryPort,
  {
    // A new public repository whose default branch holds the files in a single commit.
    readonly create: (accessToken: string, draft: RepositoryDraft) => Effect.Effect<Repository, GitHubApiError>
  }
>()('@typika/web/GitHubRepositoryPort') {}

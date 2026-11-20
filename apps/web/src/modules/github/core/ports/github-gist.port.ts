import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { GitHubApiError } from '../domain/errors/github-api.error.ts'
import type { Gist, GistDraft } from '../domain/gist.domain-model.ts'

export class GitHubGistPort extends Context.Service<
  GitHubGistPort,
  {
    readonly get: (id: string, accessToken: string | undefined) => Effect.Effect<Gist, GitHubApiError>
    readonly create: (accessToken: string, draft: GistDraft) => Effect.Effect<Gist, GitHubApiError>
    // Files of the gist that the draft no longer has are deleted.
    readonly replace: (accessToken: string, id: string, draft: GistDraft) => Effect.Effect<Gist, GitHubApiError>
  }
>()('@typika/web/GitHubGistPort') {}

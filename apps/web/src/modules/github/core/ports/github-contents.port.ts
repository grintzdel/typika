import type { TemplateFiles, TemplateRef } from '@typika/manifest'
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { GitHubApiError } from '../domain/errors/github-api.error.ts'

export type GitHubFolder = { readonly commit: string; readonly files: TemplateFiles }

export class GitHubContentsPort extends Context.Service<
  GitHubContentsPort,
  {
    readonly readFolder: (
      ref: TemplateRef,
      accessToken: string | undefined
    ) => Effect.Effect<GitHubFolder, GitHubApiError>
  }
>()('@typika/web/GitHubContentsPort') {}

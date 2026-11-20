import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { GitHubAuthorizationError } from '../../../../github/core/domain/errors/github-authorization.error.ts'
import { GitHubScope, hasScopes } from '../../../../github/core/domain/github-oauth.domain-model.ts'
import { GitHubRepositoryPort } from '../../../../github/core/ports/github-repository.port.ts'
import { GitHubSessionPort } from '../../../../github/core/ports/github-session.port.ts'
import type { TemplateProject } from '../../domain/project.domain-model.ts'
import {
  INITIAL_COMMIT_MESSAGE,
  repositoryFilesOf,
  type PushedRepository,
} from '../../domain/repository-push.domain-model.ts'

export const pushRepositoryProgram = ({
  project,
  files,
  name,
  description,
  includeTypikaFiles,
  appOrigin,
}: {
  readonly project: TemplateProject
  readonly files: ReadonlyMap<string, string>
  readonly name: string
  readonly description: string
  readonly includeTypikaFiles: boolean
  readonly appOrigin: string
}) =>
  Effect.gen(function* () {
    const sessions = yield* GitHubSessionPort
    const repositories = yield* GitHubRepositoryPort
    const session = yield* sessions.session
    if (Option.isNone(session) || !hasScopes(session.value.scopes, [GitHubScope.PUBLIC_REPO]))
      return yield* new GitHubAuthorizationError({ reason: 'required' })
    const repository = yield* repositories
      .create(session.value.accessToken, {
        name,
        description,
        message: INITIAL_COMMIT_MESSAGE,
        files: repositoryFilesOf({
          files,
          ref: project.ref,
          includeTypikaFiles,
          title: project.manifest.title,
          templateUrl: `${appOrigin}/templates/${project.templateName}`,
        }),
      })
      .pipe(Effect.tapError((error) => (error.reason === 'unauthorized' ? sessions.clear : Effect.void)))
    return repository satisfies PushedRepository
  })

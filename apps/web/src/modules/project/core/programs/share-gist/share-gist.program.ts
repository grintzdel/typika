import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { GitHubAuthorizationError } from '../../../../github/core/domain/errors/github-authorization.error.ts'
import { GitHubScope, hasScopes } from '../../../../github/core/domain/github-oauth.domain-model.ts'
import { GitHubGistPort } from '../../../../github/core/ports/github-gist.port.ts'
import { GitHubSessionPort } from '../../../../github/core/ports/github-session.port.ts'
import { gistDescriptionOf, gistFilesOf, gistPathOf, type GistLink } from '../../domain/gist-share.domain-model.ts'
import type { TemplateProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const shareGistProgram = ({
  project,
  files,
  isPublic,
  appOrigin,
}: {
  readonly project: TemplateProject
  readonly files: ReadonlyMap<string, string>
  readonly isPublic: boolean
  readonly appOrigin: string
}) =>
  Effect.gen(function* () {
    const sessions = yield* GitHubSessionPort
    const gists = yield* GitHubGistPort
    const storage = yield* ProjectStoragePort
    const session = yield* sessions.session
    if (Option.isNone(session) || !hasScopes(session.value.scopes, [GitHubScope.GIST]))
      return yield* new GitHubAuthorizationError({ reason: 'required' })
    const { accessToken } = session.value
    const stored = yield* (
      project.projectId === undefined ? storage.findByOrigin(project.origin) : storage.findById(project.projectId)
    ).pipe(Effect.orElseSucceed(() => Option.none()))
    const shared = Option.getOrUndefined(stored)?.record
    const draft = {
      description: gistDescriptionOf(project.name),
      isPublic,
      files: gistFilesOf({
        name: project.name,
        ref: project.origin.kind === 'personal' ? undefined : project.ref,
        runtime: project.manifest.runtime.kind,
        exercise: project.exercise?.name,
        files,
      }),
    }
    const gist = yield* (
      shared?.gistId === undefined
        ? gists.create(accessToken, draft)
        : gists.replace(accessToken, shared.gistId, draft).pipe(
            Effect.catchIf(
              (error) => error.reason === 'not-found',
              () => gists.create(accessToken, draft)
            )
          )
    ).pipe(Effect.tapError((error) => (error.reason === 'unauthorized' ? sessions.clear : Effect.void)))
    if (shared !== undefined && shared.gistId !== gist.id)
      yield* storage.setGistId(shared.id, gist.id).pipe(Effect.ignore)
    return { id: gist.id, url: `${appOrigin}${gistPathOf(gist.id)}`, htmlUrl: gist.htmlUrl } satisfies GistLink
  })

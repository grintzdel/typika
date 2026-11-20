import { useAtom, useAtomSet, useAtomValue } from '@effect/atom-react'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import { beginGitHubAuthorizationAtom, gitHubStatusAtom } from '../../../github/core/atoms/github.atoms.ts'
import { GitHubApiError } from '../../../github/core/domain/errors/github-api.error.ts'
import { GitHubAuthorizationError } from '../../../github/core/domain/errors/github-authorization.error.ts'
import { GitHubScope, hasScopes } from '../../../github/core/domain/github-oauth.domain-model.ts'
import { clearGitHubResume, currentPath, GitHubIntent, isGitHubResume } from '../../../github/ui/hooks/github-resume.ts'
import { pushRepositoryAtom } from '../../core/atoms/project.atoms.ts'
import type { RepositoryPushFailure, RepositoryPushInput } from '../components/RepositoryPushSection.tsx'

const failureOf = (error: unknown): RepositoryPushFailure => {
  if (error instanceof GitHubAuthorizationError) return 'required'
  if (!(error instanceof GitHubApiError)) return 'unavailable'
  const { reason } = error
  return reason === 'unauthorized' || reason === 'rate-limited' || reason === 'name-taken' || reason === 'incomplete'
    ? reason
    : 'unavailable'
}

export const usePushRepository = (projectKey: string) => {
  const status = Option.getOrUndefined(AsyncResult.value(useAtomValue(gitHubStatusAtom)))
  const [result, push] = useAtom(pushRepositoryAtom(projectKey))
  const begin = useAtomSet(beginGitHubAuthorizationAtom, { mode: 'promiseExit' })
  const isPushing = AsyncResult.isWaiting(result)

  return {
    isEnabled: status?.isEnabled === true,
    isConnected: status !== undefined && status.isConnected && hasScopes(status.scopes, [GitHubScope.PUBLIC_REPO]),
    isPushing,
    repository: isPushing ? undefined : Option.getOrUndefined(AsyncResult.value(result)),
    failure:
      AsyncResult.isFailure(result) && !isPushing
        ? failureOf(Option.getOrUndefined(AsyncResult.error(result)))
        : undefined,
    revokeUrl: status?.revokeUrl,
    shouldResume: isGitHubResume(GitHubIntent.PUSH_REPOSITORY, currentPath()),
    handleResumed: clearGitHubResume,
    handleConnect: () => {
      void begin({
        scopes: [GitHubScope.PUBLIC_REPO],
        returnTo: currentPath(),
        intent: GitHubIntent.PUSH_REPOSITORY,
        appOrigin: window.location.origin,
      }).then((exit) => {
        if (Exit.isSuccess(exit)) window.location.assign(exit.value)
      })
    },
    handlePush: (files: ReadonlyMap<string, string>, input: RepositoryPushInput) =>
      push({ files, ...input, appOrigin: window.location.origin }),
  }
}

import { useAtom, useAtomSet, useAtomValue } from '@effect/atom-react'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as AsyncResult from 'effect/reactivity/AsyncResult'

import {
  beginGitHubAuthorizationAtom,
  gitHubStatusAtom,
  signOutGitHubAtom,
} from '../../../github/core/atoms/github.atoms.ts'
import { GitHubApiError } from '../../../github/core/domain/errors/github-api.error.ts'
import { GitHubAuthorizationError } from '../../../github/core/domain/errors/github-authorization.error.ts'
import { GitHubScope, hasScopes } from '../../../github/core/domain/github-oauth.domain-model.ts'
import { clearGitHubResume, currentPath, GitHubIntent, isGitHubResume } from '../../../github/ui/hooks/github-resume.ts'
import { shareGistAtom } from '../../core/atoms/project.atoms.ts'
import type { GistShareFailure } from '../components/GistShareSection.tsx'

const failureOf = (error: unknown): GistShareFailure => {
  if (error instanceof GitHubAuthorizationError) return 'required'
  if (error instanceof GitHubApiError && (error.reason === 'unauthorized' || error.reason === 'rate-limited'))
    return error.reason
  return 'unavailable'
}

export const useGistShare = (projectKey: string) => {
  const status = Option.getOrUndefined(AsyncResult.value(useAtomValue(gitHubStatusAtom)))
  const [result, share] = useAtom(shareGistAtom(projectKey))
  const begin = useAtomSet(beginGitHubAuthorizationAtom, { mode: 'promiseExit' })
  const signOut = useAtomSet(signOutGitHubAtom)
  const isSharing = AsyncResult.isWaiting(result)

  return {
    isEnabled: status?.isEnabled === true,
    isConnected: status !== undefined && status.isConnected && hasScopes(status.scopes, [GitHubScope.GIST]),
    isSharing,
    link: isSharing ? undefined : Option.getOrUndefined(AsyncResult.value(result)),
    failure:
      AsyncResult.isFailure(result) && !isSharing
        ? failureOf(Option.getOrUndefined(AsyncResult.error(result)))
        : undefined,
    revokeUrl: status?.revokeUrl,
    shouldResume: isGitHubResume(GitHubIntent.SHARE_GIST, currentPath()),
    handleResumed: clearGitHubResume,
    handleConnect: () => {
      void begin({
        scopes: [GitHubScope.GIST],
        returnTo: currentPath(),
        intent: GitHubIntent.SHARE_GIST,
        appOrigin: window.location.origin,
      }).then((exit) => {
        if (Exit.isSuccess(exit)) window.location.assign(exit.value)
      })
    },
    handleShare: (files: ReadonlyMap<string, string>, isPublic: boolean) =>
      share({ files, isPublic, appOrigin: window.location.origin }),
    handleSignOut: () => signOut(),
  }
}

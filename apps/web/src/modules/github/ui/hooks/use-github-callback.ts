import { useAtomSet } from '@effect/atom-react'
import * as Cause from 'effect/Cause'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import { useEffect, useRef, useState } from 'react'

import { completeGitHubAuthorizationAtom } from '../../core/atoms/github.atoms.ts'
import { GitHubAuthorizationError } from '../../core/domain/errors/github-authorization.error.ts'
import { markGitHubResume } from './github-resume.ts'

export type GitHubCallbackFailure = GitHubAuthorizationError['reason']

export const useGitHubCallback = (search: string, onReturn: (path: string) => void) => {
  const complete = useAtomSet(completeGitHubAuthorizationAtom, { mode: 'promiseExit' })
  const [failure, setFailure] = useState<GitHubCallbackFailure | undefined>(undefined)
  const hasStarted = useRef(false)

  useEffect(() => {
    // The code is single-use: a second run of the effect would fail on the consumed state.
    if (hasStarted.current) return
    hasStarted.current = true
    const params = new URLSearchParams(search)
    void complete({ code: params.get('code') ?? undefined, state: params.get('state') ?? undefined }).then((exit) => {
      if (Exit.isSuccess(exit)) {
        markGitHubResume(exit.value)
        onReturn(exit.value)
        return
      }
      const error = Option.getOrUndefined(Cause.findErrorOption(exit.cause))
      setFailure(error instanceof GitHubAuthorizationError ? error.reason : 'exchange')
    })
  }, [complete, search, onReturn])

  return { failure }
}

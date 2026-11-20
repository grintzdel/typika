import * as Effect from 'effect/Effect'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import type { GitHubScope } from '../domain/github-oauth.domain-model.ts'
import { beginGitHubAuthorizationProgram } from '../programs/begin-github-authorization/begin-github-authorization.program.ts'
import { completeGitHubAuthorizationProgram } from '../programs/complete-github-authorization/complete-github-authorization.program.ts'
import { readGitHubStatusProgram } from '../programs/read-github-status/read-github-status.program.ts'
import { signOutGitHubProgram } from '../programs/sign-out-github/sign-out-github.program.ts'

export const gitHubStatusAtom = appRuntime.atom(readGitHubStatusProgram)

export const beginGitHubAuthorizationAtom = appRuntime.fn(
  (input: { readonly scopes: ReadonlyArray<GitHubScope>; readonly returnTo: string; readonly appOrigin: string }) =>
    beginGitHubAuthorizationProgram(input)
)

export const completeGitHubAuthorizationAtom = appRuntime.fn(
  (input: { readonly code: string | undefined; readonly state: string | undefined }) =>
    completeGitHubAuthorizationProgram(input)
)

export const signOutGitHubAtom = appRuntime.fn((_: void, get) =>
  Effect.tap(signOutGitHubProgram, () => Effect.sync(() => get.refresh(gitHubStatusAtom)))
)

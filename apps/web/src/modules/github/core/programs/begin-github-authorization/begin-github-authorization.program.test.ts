import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { codeChallengeOf, GitHubScope } from '../../domain/github-oauth.domain-model.ts'
import { GITHUB_TEST_CONFIG, makeGitHubSessionsInMemory, makeGitHubTestLayer } from '../../github.test-layer.ts'
import { beginGitHubAuthorizationProgram } from './begin-github-authorization.program.ts'

const INPUT = { scopes: [GitHubScope.GIST], returnTo: '/play/strategy-ts', appOrigin: 'https://typika.example.org' }

describe('beginGitHubAuthorizationProgram', () => {
  it('sends the user to GitHub with the scope, a state and a PKCE challenge it remembers', async () => {
    const sessions = makeGitHubSessionsInMemory()

    const url = new URL(
      await Effect.runPromise(
        beginGitHubAuthorizationProgram(INPUT).pipe(Effect.provide(makeGitHubTestLayer({ sessions })))
      )
    )

    const pending = sessions.currentPending()
    expect(`${url.origin}${url.pathname}`).toBe('https://github.example.com/login/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'https://typika.example.org/auth/github/callback',
      scope: 'gist',
      state: pending?.state,
      code_challenge: await Effect.runPromise(codeChallengeOf(pending?.codeVerifier ?? '')),
      code_challenge_method: 'S256',
    })
    expect(pending?.returnTo).toBe('/play/strategy-ts')
    expect(pending?.state).not.toBe(pending?.codeVerifier)
  })

  it('keeps the scopes already granted when it asks for one more', async () => {
    const sessions = makeGitHubSessionsInMemory({ session: { accessToken: 'gho_test', scopes: ['gist'] } })

    const url = new URL(
      await Effect.runPromise(
        beginGitHubAuthorizationProgram({ ...INPUT, scopes: [GitHubScope.PUBLIC_REPO] }).pipe(
          Effect.provide(makeGitHubTestLayer({ sessions }))
        )
      )
    )

    expect(url.searchParams.get('scope')).toBe('gist public_repo')
  })

  it.each(['//evil.example.com', '/\\evil.example.com', 'https://evil.example.com'])(
    'returns to the home page rather than to %s',
    async (returnTo) => {
      const sessions = makeGitHubSessionsInMemory()

      await Effect.runPromise(
        beginGitHubAuthorizationProgram({ ...INPUT, returnTo }).pipe(Effect.provide(makeGitHubTestLayer({ sessions })))
      )

      expect(sessions.currentPending()?.returnTo).toBe('/')
    }
  )

  it('fails when the instance has no OAuth application', async () => {
    const { github: _, ...config } = GITHUB_TEST_CONFIG

    const exit = await Effect.runPromiseExit(
      beginGitHubAuthorizationProgram(INPUT).pipe(Effect.provide(makeGitHubTestLayer({ config })))
    )

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('disabled')
  })
})

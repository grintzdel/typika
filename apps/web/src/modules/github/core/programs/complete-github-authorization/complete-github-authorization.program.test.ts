import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it, vi } from 'vitest'

import { GitHubAuthorizationError } from '../../domain/errors/github-authorization.error.ts'
import { makeGitHubSessionsInMemory, makeGitHubTestLayer, TEST_GITHUB_SESSION } from '../../github.test-layer.ts'
import { completeGitHubAuthorizationProgram } from './complete-github-authorization.program.ts'

const PENDING = {
  state: 'the-state',
  codeVerifier: 'the-verifier',
  returnTo: '/play/strategy-ts',
  intent: 'share-gist',
}

const complete = (
  input: { readonly code: string | undefined; readonly state: string | undefined },
  options: Parameters<typeof makeGitHubTestLayer>[0]
) => Effect.runPromiseExit(completeGitHubAuthorizationProgram(input).pipe(Effect.provide(makeGitHubTestLayer(options))))

describe('completeGitHubAuthorizationProgram', () => {
  it('exchanges the code with the remembered verifier, keeps the session and returns where the user was', async () => {
    const sessions = makeGitHubSessionsInMemory({ pending: PENDING })
    const exchange = vi.fn(() => Effect.succeed(TEST_GITHUB_SESSION))

    const exit = await complete({ code: 'the-code', state: 'the-state' }, { sessions, exchange })

    expect(exit).toEqual(Exit.succeed({ returnTo: '/play/strategy-ts', intent: 'share-gist' }))
    expect(exchange).toHaveBeenCalledWith({ code: 'the-code', codeVerifier: 'the-verifier' })
    expect(sessions.current()).toEqual(TEST_GITHUB_SESSION)
    expect(sessions.currentPending()).toBeUndefined()
  })

  it.each([
    ['another state', { pending: PENDING }, 'forged'],
    ['no sign-in in progress', {}, 'the-state'],
  ])('refuses a callback with %s, without exchanging the code', async (_, initial, state) => {
    const sessions = makeGitHubSessionsInMemory(initial)
    const exchange = vi.fn(() => Effect.succeed(TEST_GITHUB_SESSION))

    const exit = await complete({ code: 'the-code', state }, { sessions, exchange })

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"state"')
    expect(exchange).not.toHaveBeenCalled()
    expect(sessions.current()).toBeUndefined()
  })

  it('reports a sign-in the user denied on GitHub', async () => {
    const sessions = makeGitHubSessionsInMemory({ pending: PENDING })

    const exit = await complete({ code: undefined, state: 'the-state' }, { sessions })

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"denied"')
  })

  it('reports a code GitHub refused, and forgets the sign-in in progress', async () => {
    const sessions = makeGitHubSessionsInMemory({ pending: PENDING })

    const exit = await complete(
      { code: 'the-code', state: 'the-state' },
      { sessions, exchange: () => Effect.fail(new GitHubAuthorizationError({ reason: 'exchange' })) }
    )

    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('"reason":"exchange"')
    expect(sessions.currentPending()).toBeUndefined()
  })
})

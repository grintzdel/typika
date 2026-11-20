import { renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { makeGitHubSessionsInMemory, makeGitHubTestLayer, TEST_GITHUB_SESSION } from '../../core/github.test-layer.ts'
import { useGitHubCallback } from './use-github-callback.ts'

const PENDING = { state: 'the-state', codeVerifier: 'the-verifier', returnTo: '/play/sample-ts', intent: 'share-gist' }

const renderCallback = (search: string, sessions = makeGitHubSessionsInMemory({ pending: PENDING })) => {
  const onReturn = vi.fn()
  const rendered = renderHook(() => useGitHubCallback(search, onReturn), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer(
          { 'sample-ts': templateFiles() },
          makeProjectStorageInMemory(),
          makeGitHubTestLayer({ sessions })
        ),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })
  return { ...rendered, onReturn, sessions }
}

afterEach(() => sessionStorage.clear())

describe('useGitHubCallback', () => {
  it('completes the sign-in, then returns to the page it started from and asks it to resume', async () => {
    const { result, onReturn, sessions } = renderCallback('?code=the-code&state=the-state')

    await waitFor(() => expect(onReturn).toHaveBeenCalledWith('/play/sample-ts'))
    expect(sessions.current()).toEqual(TEST_GITHUB_SESSION)
    expect(sessionStorage.getItem('typika:github:resume')).toBe('share-gist /play/sample-ts')
    expect(result.current.failure).toBeUndefined()
  })

  it.each([
    ['a forged state', '?code=the-code&state=forged', 'state'],
    ['a denied access', '?error=access_denied&state=the-state', 'denied'],
  ])('stays on the page with the cause for %s', async (_, search, failure) => {
    const { result, onReturn, sessions } = renderCallback(search)

    await waitFor(() => expect(result.current.failure).toBe(failure))
    expect(onReturn).not.toHaveBeenCalled()
    expect(sessions.current()).toBeUndefined()
    expect(sessionStorage.getItem('typika:github:resume')).toBeNull()
  })
})

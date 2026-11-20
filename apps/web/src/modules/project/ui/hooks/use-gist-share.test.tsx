import { act, renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { GitHubApiError } from '../../../github/core/domain/errors/github-api.error.ts'
import {
  GITHUB_TEST_CONFIG,
  makeGistsInMemory,
  makeGitHubSessionsInMemory,
  makeGitHubTestLayer,
  TEST_GITHUB_SESSION,
} from '../../../github/core/github.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { useGistShare } from './use-gist-share.ts'

const renderGistShare = (github: ReturnType<typeof makeGitHubTestLayer>) =>
  renderHook(() => useGistShare('sample-ts'), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles() }, makeProjectStorageInMemory(), github),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

const signedIn = () => makeGitHubSessionsInMemory({ session: TEST_GITHUB_SESSION })

afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('useGistShare', () => {
  it('is disabled on an instance without an OAuth application', async () => {
    const { github: _, ...config } = GITHUB_TEST_CONFIG
    const { result } = renderGistShare(makeGitHubTestLayer({ config }))

    await waitFor(() => expect(result.current.revokeUrl).toBeUndefined())
    expect(result.current.isEnabled).toBe(false)
  })

  it('offers to sign in, then leaves for GitHub and remembers this page', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', {
      origin: window.location.origin,
      pathname: '/play/sample-ts',
      search: '',
      hash: '',
      assign,
    })
    const sessions = makeGitHubSessionsInMemory()
    const { result } = renderGistShare(makeGitHubTestLayer({ sessions }))
    await waitFor(() => expect(result.current.isEnabled).toBe(true))
    expect(result.current.isConnected).toBe(false)

    act(() => result.current.handleConnect())

    await waitFor(() => expect(assign).toHaveBeenCalledOnce())
    expect(String(assign.mock.calls[0]?.[0])).toContain('https://github.example.com/login/oauth/authorize?')
    expect(sessions.currentPending()?.returnTo).toBe('/play/sample-ts')
  })

  it('shares the current files to a gist and gives its link on this origin', async () => {
    const gists = makeGistsInMemory()
    const { result } = renderGistShare(makeGitHubTestLayer({ sessions: signedIn(), gists }))
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => result.current.handleShare(new Map([['src/main.ts', 'edited']]), false))

    await waitFor(() => expect(result.current.link?.url).toBe(`${window.location.origin}/g/gist1`))
    expect(gists.gists.get('gist1')?.files.get('src__main.ts')).toBe('edited')
    expect(result.current.failure).toBeUndefined()
  })

  it('reports a session GitHub refuses, and asks to sign in again', async () => {
    const gists = { ...makeGistsInMemory(), create: () => Effect.fail(new GitHubApiError({ reason: 'unauthorized' })) }
    const { result } = renderGistShare(makeGitHubTestLayer({ sessions: signedIn(), gists }))
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => result.current.handleShare(new Map([['src/main.ts', 'edited']]), false))

    await waitFor(() => expect(result.current.failure).toBe('unauthorized'))
    await waitFor(() => expect(result.current.isConnected).toBe(false))
  })

  it('signs out', async () => {
    const sessions = signedIn()
    const { result } = renderGistShare(makeGitHubTestLayer({ sessions }))
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => result.current.handleSignOut())

    await waitFor(() => expect(result.current.isConnected).toBe(false))
    expect(sessions.current()).toBeUndefined()
  })

  it('resumes the share dialog on the page the sign-in came back to, once', () => {
    sessionStorage.setItem('typika:github:resume', `share-gist ${window.location.pathname}${window.location.search}`)
    const { result, rerender } = renderGistShare(makeGitHubTestLayer())
    expect(result.current.shouldResume).toBe(true)

    act(() => result.current.handleResumed())
    rerender()

    expect(result.current.shouldResume).toBe(false)
  })
})

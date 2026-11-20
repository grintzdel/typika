import { act, renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import {
  makeGitHubSessionsInMemory,
  makeGitHubTestLayer,
  makeRepositoriesInMemory,
  TEST_GITHUB_SESSION,
} from '../../../github/core/github.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { usePushRepository } from './use-push-repository.ts'

const INPUT = { name: 'sample-remix', description: '', includeTypikaFiles: true }
const FILES = new Map([['src/main.ts', 'edited']])

const renderPush = (github: ReturnType<typeof makeGitHubTestLayer>) =>
  renderHook(() => usePushRepository('sample-ts'), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles() }, makeProjectStorageInMemory(), github),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

const canPush = () =>
  makeGitHubSessionsInMemory({ session: { accessToken: 'gho_test', scopes: ['gist', 'public_repo'] } })

afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('usePushRepository', () => {
  it('asks a session that can only create gists for the right to create a repository, keeping gists', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', {
      origin: window.location.origin,
      pathname: '/play/sample-ts',
      search: '',
      hash: '',
      assign,
    })
    const sessions = makeGitHubSessionsInMemory({ session: TEST_GITHUB_SESSION })
    const { result } = renderPush(makeGitHubTestLayer({ sessions }))
    await waitFor(() => expect(result.current.isEnabled).toBe(true))
    expect(result.current.isConnected).toBe(false)

    act(() => result.current.handleConnect())

    await waitFor(() => expect(assign).toHaveBeenCalledOnce())
    expect(new URL(String(assign.mock.calls[0]?.[0])).searchParams.get('scope')).toBe('gist public_repo')
    expect(sessions.currentPending()).toMatchObject({ returnTo: '/play/sample-ts', intent: 'push-repository' })
  })

  it('pushes the current files and gives the repository', async () => {
    const repositories = makeRepositoriesInMemory()
    const { result } = renderPush(makeGitHubTestLayer({ sessions: canPush(), repositories }))
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => result.current.handlePush(FILES, INPUT))

    await waitFor(() => expect(result.current.repository?.fullName).toBe('octocat/sample-remix'))
    expect(repositories.drafts.get('sample-remix')?.files.get('src/main.ts')).toBe('edited')
    expect(result.current.failure).toBeUndefined()
  })

  it('reports a name already taken', async () => {
    const { result } = renderPush(makeGitHubTestLayer({ sessions: canPush() }))
    await waitFor(() => expect(result.current.isConnected).toBe(true))
    act(() => result.current.handlePush(FILES, INPUT))
    await waitFor(() => expect(result.current.repository).toBeDefined())

    act(() => result.current.handlePush(FILES, INPUT))

    await waitFor(() => expect(result.current.failure).toBe('name-taken'))
    expect(result.current.isConnected).toBe(true)
  })

  it('resumes the export dialog on the page the sign-in came back to', () => {
    sessionStorage.setItem(
      'typika:github:resume',
      `push-repository ${window.location.pathname}${window.location.search}`
    )

    const { result } = renderPush(makeGitHubTestLayer())

    expect(result.current.shouldResume).toBe(true)
  })
})

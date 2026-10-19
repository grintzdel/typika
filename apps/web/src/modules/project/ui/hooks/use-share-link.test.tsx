import { act, renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { useShareLink } from './use-share-link.ts'

const renderShare = () =>
  renderHook(() => useShareLink('sample-ts'), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles() }),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

describe('useShareLink', () => {
  it('creates a link to the current files on this origin', async () => {
    const { result } = renderShare()

    act(() => result.current.handleCreate(new Map([['src/main.ts', 'edited']])))

    await waitFor(() => expect(result.current.link?._tag).toBe('Ready'))
    expect(result.current.link?._tag === 'Ready' && result.current.link.url).toMatch(
      new RegExp(`^${window.location.origin}/s#1\\.`)
    )
  })

  it('copies the link and says so', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { result } = renderShare()

    act(() => result.current.handleCopy('https://typika.dev/s#1.abc'))

    await waitFor(() => expect(result.current.isCopied).toBe(true))
    expect(writeText).toHaveBeenCalledWith('https://typika.dev/s#1.abc')
  })
})

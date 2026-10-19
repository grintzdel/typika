import { renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { projectFiles, projectRecord } from '../../__tests__/project.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { useRecentProjects } from './use-recent-projects.ts'

const hydration = vi.hoisted(() => ({ isHydrated: true }))

vi.mock('@tanstack/react-router', () => ({ useHydrated: () => hydration.isHydrated }))

const RECORD = projectRecord({ name: 'sample-ts' })

const renderRecent = () =>
  renderHook(() => useRecentProjects(), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({}, makeProjectStorageInMemory([{ record: RECORD, files: projectFiles({}) }])),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

describe('useRecentProjects', () => {
  it('reads the local projects once the page is hydrated', async () => {
    hydration.isHydrated = true
    const { result } = renderRecent()

    await waitFor(() => expect(result.current.projects.map((project) => project.path)).toEqual([`/p/${RECORD.id}`]))
  })

  it('reads nothing while the page hydrates', () => {
    hydration.isHydrated = false
    const { result } = renderRecent()

    expect(result.current.projects).toEqual([])
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { projectFiles, projectRecord } from '../../__tests__/project.factory.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { StorageQuotaPort } from '../../core/ports/storage-quota.port.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { useProjects } from './use-projects.ts'

const renderProjects = () => {
  const record = projectRecord({ name: 'sample-ts' })
  const storage = makeProjectStorageInMemory([{ record, files: projectFiles({}) }])
  const rendered = renderHook(() => useProjects(), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage),
        Layer.succeed(StorageQuotaPort, { estimate: Effect.succeed(Option.some({ usage: 10, quota: 100 })) }),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })
  return { ...rendered, record, storage }
}

const namesOf = (projects: ReadonlyArray<{ readonly name: string }>) => projects.map((project) => project.name)

describe('useProjects', () => {
  it('lists the local projects with the storage used', async () => {
    const { result } = renderProjects()

    await waitFor(() => expect(namesOf(result.current.projects)).toEqual(['sample-ts']))
    expect(result.current.isLoading).toBe(false)
    await waitFor(() => expect(result.current.storage).toEqual({ usage: 10, quota: 100, isNearlyFull: false }))
  })

  it('lists a renamed project under its new name', async () => {
    const { result, record } = renderProjects()
    await waitFor(() => expect(result.current.projects).toHaveLength(1))

    act(() => result.current.handleRename(record.id, 'My pricing'))

    await waitFor(() => expect(namesOf(result.current.projects)).toEqual(['My pricing']))
  })

  it('lists a copy next to its original', async () => {
    const { result, record } = renderProjects()
    await waitFor(() => expect(result.current.projects).toHaveLength(1))

    act(() => result.current.handleDuplicate(record.id, 'sample-ts (copy)'))

    await waitFor(() => expect(namesOf(result.current.projects).toSorted()).toEqual(['sample-ts', 'sample-ts (copy)']))
  })

  it('removes a deleted project from the list', async () => {
    const { result, record, storage } = renderProjects()
    await waitFor(() => expect(result.current.projects).toHaveLength(1))

    act(() => result.current.handleDelete(record.id))

    await waitFor(() => expect(result.current.projects).toEqual([]))
    expect(storage.projects.size).toBe(0)
  })
})

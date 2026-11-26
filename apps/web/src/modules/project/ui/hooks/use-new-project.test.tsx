import { act, renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import { StorageQuotaPort } from '../../core/ports/storage-quota.port.ts'
import {
  failingProjectStorage,
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  type ProjectStorage,
} from '../../core/project.test-layer.ts'
import { useNewProject } from './use-new-project.ts'

const renderNewProject = (initialTemplate?: string, storage: ProjectStorage = makeProjectStorageInMemory()) => {
  const open = vi.fn()
  const rendered = renderHook(() => useNewProject({ initialTemplate, open }), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage),
        Layer.succeed(StorageQuotaPort, { estimate: Effect.succeed(Option.none()) }),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })
  return { ...rendered, open }
}

describe('useNewProject', () => {
  it('stays closed until asked, and offers the templates of the catalogue', async () => {
    const { result } = renderNewProject()

    expect(result.current.isOpen).toBe(false)
    await waitFor(() =>
      expect(result.current.templates).toEqual([{ name: 'sample-ts', title: 'Sample', language: 'typescript' }])
    )
    act(() => result.current.handleOpenChange(true))
    expect(result.current.isOpen).toBe(true)
  })

  it('opens at once when a template was asked for', () => {
    const { result } = renderNewProject('sample-ts')

    expect(result.current.isOpen).toBe(true)
    expect(result.current.initialTemplate).toBe('sample-ts')
  })

  it('opens a blank project once it is created', async () => {
    const storage = makeProjectStorageInMemory()
    const { result, open } = renderNewProject(undefined, storage)

    act(() => result.current.handleCreateBlank({ name: 'My sandbox', language: 'typescript' }))

    await waitFor(() => expect(open).toHaveBeenCalledOnce())
    const [id] = storage.projects.keys()
    expect(open).toHaveBeenCalledWith(`/p/${id}`)
  })

  it('opens the copy of a template once it is created', async () => {
    const storage = makeProjectStorageInMemory()
    const { result, open } = renderNewProject(undefined, storage)

    act(() => result.current.handleCopyTemplate({ template: 'sample-ts', name: 'Mine' }))

    await waitFor(() => expect(open).toHaveBeenCalledOnce())
    expect([...storage.projects.values()][0]?.record.name).toBe('Mine')
  })

  it('says when the project could not be stored', async () => {
    const { result, open } = renderNewProject(undefined, failingProjectStorage)

    act(() => result.current.handleCreateBlank({ name: 'My sandbox', language: 'go' }))

    await waitFor(() => expect(result.current.hasFailed).toBe(true))
    expect(result.current.isCreating).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })
})

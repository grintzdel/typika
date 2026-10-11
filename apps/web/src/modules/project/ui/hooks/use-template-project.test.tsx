import { act, renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { projectPath } from '../../__tests__/project.factory.ts'
import { templateFiles } from '../../__tests__/template.factory.ts'
import {
  failingProjectStorage,
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  type ProjectStorage,
} from '../../core/project.test-layer.ts'
import { useTemplateProject } from './use-template-project.ts'

const renderProject = (name = 'sample-ts', storage: ProjectStorage = makeProjectStorageInMemory()) =>
  renderHook(() => useTemplateProject(name), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

const MAIN = projectPath('src/main.ts')

describe('useTemplateProject', () => {
  it('exposes the original content of a file and the tour steps', async () => {
    const { result } = renderProject()

    await waitFor(() => expect(result.current.template).toBeDefined())
    expect(result.current.template?.originalOf('src/main.ts')).toBe("console.log('hello')\n")
    expect(result.current.template?.originalOf('src/missing.ts')).toBeUndefined()
    expect(result.current.template?.tourSteps).toEqual([])
  })

  it('lists the embedded templates', async () => {
    const { result } = renderProject()

    await waitFor(() => expect(result.current.embeddedTemplates).toEqual(['sample-ts']))
  })

  it('exposes the template title, entry and file tree', async () => {
    const { result } = renderProject()

    await waitFor(() => expect(result.current.template).toBeDefined())
    expect(result.current.template?.title).toBe('Sample')
    expect(result.current.template?.entry).toBe('src/main.ts')
    expect(result.current.template?.tree.map((node) => node.name)).toEqual([
      'src',
      'tests',
      'LICENSE',
      'README.md',
      'Typika',
    ])
    expect(result.current.template?.contentOf('src/main.ts')).toBe("console.log('hello')\n")
    expect(result.current.modifiedPaths).toEqual([])
  })

  it('reports a missing template', async () => {
    const { result } = renderProject('missing-ts')

    await waitFor(() => expect(result.current.failure).toEqual({ _tag: 'NotFound', name: 'missing-ts' }))
  })

  it('reports the files modified once the edits are saved', async () => {
    const storage = makeProjectStorageInMemory()
    const { result } = renderProject('sample-ts', storage)
    await waitFor(() => expect(result.current.template).toBeDefined())

    act(() => result.current.handleSave([[MAIN, 'edited']]))

    await waitFor(() => expect(result.current.modifiedPaths).toEqual(['src/main.ts']))
    expect(result.current.saveFailed).toBe(false)
    expect([...storage.projects.values()][0]?.files.get(MAIN)).toBe('edited')
  })

  it('reopens the saved edits', async () => {
    const storage = makeProjectStorageInMemory()
    const first = renderProject('sample-ts', storage)
    await waitFor(() => expect(first.result.current.template).toBeDefined())
    act(() => first.result.current.handleSave([[MAIN, 'edited']]))
    await waitFor(() => expect(first.result.current.modifiedPaths).toEqual(['src/main.ts']))
    first.unmount()

    const { result } = renderProject('sample-ts', storage)

    await waitFor(() => expect(result.current.template?.contentOf('src/main.ts')).toBe('edited'))
    expect(result.current.modifiedPaths).toEqual(['src/main.ts'])
  })

  it('tells when the edits could not be saved', async () => {
    const { result } = renderProject('sample-ts', failingProjectStorage)
    await waitFor(() => expect(result.current.template).toBeDefined())

    act(() => result.current.handleSave([[MAIN, 'edited']]))

    await waitFor(() => expect(result.current.saveFailed).toBe(true))
  })

  it('reopens the template files after a reset', async () => {
    const { result } = renderProject()
    await waitFor(() => expect(result.current.template).toBeDefined())
    const generation = result.current.template?.generation
    act(() => result.current.handleSave([[MAIN, 'edited']]))
    await waitFor(() => expect(result.current.modifiedPaths).toEqual(['src/main.ts']))

    act(() => result.current.handleReset())

    await waitFor(() => expect(result.current.template?.generation).not.toBe(generation))
    expect(result.current.modifiedPaths).toEqual([])
    expect(result.current.template?.contentOf('src/main.ts')).toBe("console.log('hello')\n")
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { openTemplateProgram } from '../../../project/core/programs/open-template/open-template.program.ts'
import { saveProjectFilesProgram } from '../../../project/core/programs/save-project-files/save-project-files.program.ts'
import {
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  type InMemoryProjectStorage,
} from '../../../project/core/project.test-layer.ts'
import { LOAD_PROGRESS, LOCATED_DIAGNOSTIC, makeFakeRuntime, projectPath } from '../../__tests__/runtime.factory.ts'
import type { FileWrite } from '../../core/domain/file-write.domain-model.ts'
import { makeRuntimeTestLayer } from '../../core/runtime.test-layer.ts'
import { useSandboxRuntime } from './use-sandbox-runtime.ts'

const TEMPLATES = { 'sample-ts': templateFiles() }

const renderSandbox = (
  storage = makeProjectStorageInMemory(),
  pending: ReadonlyArray<FileWrite> = [[projectPath('src/main.ts'), 'edited']]
) => {
  const fake = makeFakeRuntime()
  const wrapper = makeRegistryWrapper(
    Layer.mergeAll(
      makeProjectTestLayer(TEMPLATES, storage),
      makeRuntimeTestLayer(fake.port),
      makeLanguageServiceInMemory().layer,
      makeExerciseProgressInMemory().layer
    )
  )
  return { ...renderHook(() => useSandboxRuntime('sample-ts', () => pending), { wrapper }), journal: fake.journal }
}

const saveMain = (storage: InMemoryProjectStorage, content: string) =>
  Effect.runPromise(
    openTemplateProgram('sample-ts').pipe(
      Effect.flatMap((project) => saveProjectFilesProgram({ project, edits: [[projectPath('src/main.ts'), content]] })),
      Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
    )
  )

describe('useSandboxRuntime', () => {
  it('is ready once the session booted', async () => {
    const { result } = renderSandbox()

    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('runs the entry with the pending edits', async () => {
    const { result } = renderSandbox()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.handleRun())

    await waitFor(() => expect(result.current.console?.outcome).toEqual({ _tag: 'Exited', code: 0 }))
    expect(result.current.console?.entries).toEqual([{ stream: 'stdout', text: 'edited' }])
  })

  it('runs the tests', async () => {
    const { result } = renderSandbox()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.handleTest())

    await waitFor(() => expect(result.current.testRun?.outcome).toMatchObject({ _tag: 'Finished', status: 'passed' }))
    expect(result.current.isTesting).toBe(false)
  })

  it('boots the runtime from the saved project files', async () => {
    const storage = makeProjectStorageInMemory()
    await saveMain(storage, 'saved')
    const { result } = renderSandbox(storage, [])
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.handleRun())

    await waitFor(() => expect(result.current.console?.entries).toEqual([{ stream: 'stdout', text: 'saved' }]))
  })

  it('reboots the runtime from the latest saved files on retry', async () => {
    const storage = makeProjectStorageInMemory()
    const { result, journal } = renderSandbox(storage, [])
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await saveMain(storage, 'saved later')

    act(() => result.current.handleRetry())
    await waitFor(() => expect(journal.filter((entry) => entry === 'booted')).toHaveLength(2))
    act(() => result.current.handleRun())

    await waitFor(() => expect(result.current.console?.entries).toEqual([{ stream: 'stdout', text: 'saved later' }]))
  })

  it('reports the download of the runtime assets', async () => {
    const { result } = renderSandbox()

    await waitFor(() =>
      expect(result.current.download).toEqual({ loadedBytes: LOAD_PROGRESS.at(-1)?.loadedBytes, totalBytes: 2 })
    )
  })

  it('stops a running program', async () => {
    const { result, journal } = renderSandbox(undefined, [[projectPath('src/main.ts'), 'hang']])
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.handleRun())
    await waitFor(() => expect(result.current.isRunning).toBe(true))

    act(() => result.current.handleStop())

    await waitFor(() => expect(result.current.console?.outcome).toEqual({ _tag: 'Interrupted' }))
    expect(result.current.isRunning).toBe(false)
    await waitFor(() => expect(journal).toContain('run stopped'))
  })

  it('exposes the located diagnostics of the last build', async () => {
    const { result } = renderSandbox(undefined, [[projectPath('src/main.ts'), 'syntax error']])
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => result.current.handleRun())

    await waitFor(() => expect(result.current.diagnostics).toEqual([LOCATED_DIAGNOSTIC]))
    act(() => result.current.handleTest())
    await waitFor(() => expect(result.current.testRun?.outcome).toMatchObject({ _tag: 'Finished' }))
    expect(result.current.diagnostics).toEqual([])
  })
})

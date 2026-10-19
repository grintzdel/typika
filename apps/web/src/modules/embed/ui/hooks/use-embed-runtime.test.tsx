import { act, renderHook, waitFor } from '@testing-library/react'
import type { RuntimeKind } from '@typika/manifest'
import * as Layer from 'effect/Layer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { embedProjectKeyOf } from '../../../project/core/domain/project.domain-model.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { embedOptionsOf } from '../../core/domain/embed.domain-model.ts'
import { useEmbedRuntime } from './use-embed-runtime.ts'

const renderEmbed = (search: Readonly<Record<string, unknown>> = {}, runtime: RuntimeKind = 'browser-js') => {
  const fake = makeFakeRuntime()
  const wrapper = makeRegistryWrapper(
    Layer.mergeAll(
      makeProjectTestLayer({ 'sample-ts': templateFiles() }, makeProjectStorageInMemory()),
      makeRuntimeTestLayer(fake.port),
      makeLanguageServiceInMemory().layer,
      makeExerciseProgressInMemory().layer
    )
  )
  const rendered = renderHook(() => useEmbedRuntime(embedProjectKeyOf('sample-ts'), embedOptionsOf(search), runtime), {
    wrapper,
  })
  return { ...rendered, journal: fake.journal }
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

const setSecureContext = (isSecure: boolean) => vi.spyOn(window, 'isSecureContext', 'get').mockReturnValue(isSecure)

describe('useEmbedRuntime', () => {
  beforeEach(() => {
    if (!('isSecureContext' in window))
      Object.defineProperty(window, 'isSecureContext', { get: () => true, configurable: true })
    setSecureContext(true)
  })

  afterEach(() => vi.restoreAllMocks())

  it('starts no runtime before the first click', async () => {
    const { result, journal } = renderEmbed()
    await settle()

    expect(result.current.status).toBe('idle')
    expect(journal).not.toContain('booted')
  })

  it('starts the runtime on the first run, then runs the edits made before', async () => {
    const { result, journal } = renderEmbed()
    await settle()

    act(() => result.current.handleChange('src/main.ts', 'edited before the start'))
    await settle()
    act(() => result.current.handleRun())

    await waitFor(() => expect(result.current.console?.outcome).toEqual({ _tag: 'Exited', code: 0 }))
    expect(result.current.console?.entries).toEqual([{ stream: 'stdout', text: 'edited before the start' }])
    expect(journal.filter((entry) => entry === 'booted')).toHaveLength(1)
  })

  it('runs the tests when the first click is on Tests', async () => {
    const { result } = renderEmbed()

    act(() => result.current.handleTest())

    await waitFor(() => expect(result.current.testRun?.counts.passed).toBe(1))
  })

  it('starts and runs on load when asked to', async () => {
    const { result } = renderEmbed({ run: 'auto' })

    await waitFor(() => expect(result.current.console?.outcome).toEqual({ _tag: 'Exited', code: 0 }))
  })

  it('runs the tests on load when the tests panel is shown', async () => {
    const { result } = renderEmbed({ run: 'auto', panel: 'tests' })

    await waitFor(() => expect(result.current.testRun?.counts.passed).toBe(1))
  })

  it('waits for a click before starting Go, even when asked to run on load', async () => {
    const { result, journal } = renderEmbed({ run: 'auto' }, 'go')
    await settle()

    expect(result.current.status).toBe('idle')
    expect(journal).not.toContain('booted')
  })

  it('starts nothing under a page that is not a secure context', async () => {
    setSecureContext(false)
    const { result, journal } = renderEmbed({ run: 'auto' })
    await settle()

    act(() => result.current.handleRun())
    await settle()

    expect(result.current.status).toBe('insecure')
    expect(journal).not.toContain('booted')
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime, projectPath } from '../../__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../core/runtime.test-layer.ts'
import { useSandboxRuntime } from './use-sandbox-runtime.ts'

const renderSandbox = () => {
  const fake = makeFakeRuntime()
  const wrapper = makeRegistryWrapper(
    Layer.mergeAll(makeProjectTestLayer({ 'sample-ts': templateFiles() }), makeRuntimeTestLayer(fake.port))
  )
  return renderHook(() => useSandboxRuntime('sample-ts', () => [[projectPath('src/main.ts'), 'edited']]), { wrapper })
}

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
})

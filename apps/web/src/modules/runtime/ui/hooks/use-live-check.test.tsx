import { renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { LOCATED_DIAGNOSTIC, makeFakeRuntime, projectPath } from '../../__tests__/runtime.factory.ts'
import type { FileWrite } from '../../core/domain/file-write.domain-model.ts'
import { makeRuntimeTestLayer } from '../../core/runtime.test-layer.ts'
import { useLiveCheck } from './use-live-check.ts'

const renderLiveCheck = (canCheck: boolean) => {
  const fake = makeFakeRuntime({ canCheck })
  let pending: ReadonlyArray<FileWrite> = []
  const wrapper = makeRegistryWrapper(
    Layer.mergeAll(
      makeProjectTestLayer({ 'sample-ts': templateFiles() }, makeProjectStorageInMemory()),
      makeRuntimeTestLayer(fake.port),
      makeLanguageServiceInMemory().layer,
      makeExerciseProgressInMemory().layer
    )
  )
  const rendered = renderHook(
    ({ revision }: { readonly revision: number }) =>
      useLiveCheck('sample-ts', revision, () => {
        const taken = pending
        pending = []
        return taken
      }),
    { wrapper, initialProps: { revision: 0 } }
  )
  const edit = (writes: ReadonlyArray<FileWrite>, revision: number) => {
    pending = writes
    rendered.rerender({ revision })
  }
  return { ...rendered, edit, journal: fake.journal, pendingOf: () => pending }
}

describe('useLiveCheck', () => {
  it('checks the project once it is open, then again after each change', async () => {
    const { result, edit } = renderLiveCheck(true)
    await waitFor(() => expect(result.current.diagnostics).toEqual([]))

    edit([[projectPath('src/main.ts'), 'syntax error']], 1)

    await waitFor(() => expect(result.current.diagnostics).toEqual([LOCATED_DIAGNOSTIC]))
  })

  it('leaves the edits to the next run with a runtime that cannot check', async () => {
    const { result, journal, edit, pendingOf } = renderLiveCheck(false)
    await waitFor(() => expect(journal).toContain('booted'))

    edit([[projectPath('src/main.ts'), 'syntax error']], 1)
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(result.current.diagnostics).toBeUndefined()
    expect(pendingOf()).toHaveLength(1)
  })
})

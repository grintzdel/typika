import { renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles, templateToml } from '../../../project/__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { useComparison } from './use-comparison.ts'

const renderComparison = (name: string, a?: string, b?: string) =>
  renderHook(() => useComparison(name, a, b), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer({ 'sample-ts': templateFiles('sample-ts', { 'typika.toml': templateToml('sample-ts') }) }),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

describe('useComparison', () => {
  it('asks for a variant when the template has none', async () => {
    const { result } = renderComparison('sample-ts')

    await waitFor(() => expect(result.current.comparison?._tag).toBe('Choose'))
    expect(result.current.comparison).toMatchObject({ choice: { _tag: 'NoVariant' } })
    expect(result.current.failure).toBeUndefined()
  })

  it('tells when the template is unknown', async () => {
    const { result } = renderComparison('missing-ts')

    await waitFor(() => expect(result.current.failure).toEqual({ _tag: 'NotFound', name: 'missing-ts' }))
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeLanguageServiceInMemory } from '../../../editor/core/editor.test-layer.ts'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { templateFiles, templateToml } from '../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../core/project.test-layer.ts'
import { useBaseTemplate } from './use-base-template.ts'

const WITH_BASE = `${templateToml()}\n[base]\ntemplate = "github:typika/templates/sample-base/ts"\nfocus = ["src/**"]\n`

const renderBase = (templates: Parameters<typeof makeProjectTestLayer>[0]) =>
  renderHook(() => useBaseTemplate('sample-ts'), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer(templates),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        makeLanguageServiceInMemory().layer,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

describe('useBaseTemplate', () => {
  it('exposes the base of the template', async () => {
    const { result } = renderBase({
      'sample-ts': templateFiles('sample-ts', { 'typika.toml': WITH_BASE }),
      'sample-base-ts': templateFiles('sample-base-ts', { 'src/main.ts': "console.log('base')\n" }),
    })

    await waitFor(() => expect(result.current.base?.name).toBe('sample-base-ts'))
    expect(result.current.base?.focus).toEqual(['src/**'])
    expect(result.current.base?.files.get('src/main.ts')).toBe("console.log('base')\n")
  })

  it('has no base for a template without one', async () => {
    const { result } = renderBase({ 'sample-ts': templateFiles() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.base).toBeUndefined()
  })
})

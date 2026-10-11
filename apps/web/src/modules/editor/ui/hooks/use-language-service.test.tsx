import { renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { templateFiles } from '../../../project/__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { EditorLanguageServiceError } from '../../core/domain/errors/editor-language-service.error.ts'
import { makeLanguageServiceInMemory } from '../../core/editor.test-layer.ts'
import { LanguageServicePort } from '../../core/ports/language-service.port.ts'
import { useLanguageService } from './use-language-service.ts'

const TEMPLATES = { 'sample-ts': templateFiles('sample-ts', { 'src/main.ts': 'const total: number = 1\n' }) }

const renderLanguageService = (languageService: Layer.Layer<LanguageServicePort>) =>
  renderHook(() => useLanguageService('sample-ts'), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(makeProjectTestLayer(TEMPLATES), makeRuntimeTestLayer(makeFakeRuntime().port), languageService)
    ),
  })

describe('useLanguageService', () => {
  it('starts the language service on the files of the project', async () => {
    const languageService = makeLanguageServiceInMemory()
    const { result } = renderLanguageService(languageService.layer)

    await waitFor(() => expect(result.current).toBeDefined())
    const info = await Effect.runPromise(
      result.current?.quickInfo('src/main.ts', 'const '.length) ?? Effect.succeed(undefined)
    )

    expect(info).toMatchObject({ signature: 'const total: number' })
    expect(Object.keys(languageService.started[0] ?? {})).toContain('src/main.ts')
  })

  it('stays without a language service when it cannot start', async () => {
    const { result } = renderLanguageService(
      Layer.succeed(LanguageServicePort, {
        start: () => Effect.fail(new EditorLanguageServiceError({ cause: 'blocked' })),
      })
    )

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current).toBeUndefined()
  })
})

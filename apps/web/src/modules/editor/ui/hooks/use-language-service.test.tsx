import { renderHook, waitFor } from '@testing-library/react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { makeRegistryWrapper } from '../../../app/__tests__/registry-wrapper.tsx'
import { makeExerciseProgressInMemory } from '../../../exercise/core/exercise.test-layer.ts'
import { templateFiles, templateToml } from '../../../project/__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../../project/core/project.test-layer.ts'
import { makeFakeRuntime } from '../../../runtime/__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../../runtime/core/runtime.test-layer.ts'
import { EditorLanguageServiceError } from '../../core/domain/errors/editor-language-service.error.ts'
import { makeLanguageServiceInMemory } from '../../core/editor.test-layer.ts'
import { LanguageServicePort } from '../../core/ports/language-service.port.ts'
import { useLanguageService } from './use-language-service.ts'

const TEMPLATES = {
  'sample-ts': templateFiles('sample-ts', { 'src/main.ts': 'const total: number = 1\n' }),
  'sample-go': templateFiles('sample-go', {
    'typika.toml': templateToml('sample-go')
      .replace('language = "typescript"', 'language = "go"')
      .replace('kind = "browser-js"', 'kind = "go"')
      .replace('src/main.ts', 'main.go'),
    'main.go': 'package main\n',
  }),
}

const renderLanguageService = (languageService: Layer.Layer<LanguageServicePort>, name = 'sample-ts') =>
  renderHook(() => useLanguageService(name), {
    wrapper: makeRegistryWrapper(
      Layer.mergeAll(
        makeProjectTestLayer(TEMPLATES),
        makeRuntimeTestLayer(makeFakeRuntime().port),
        languageService,
        makeExerciseProgressInMemory().layer
      )
    ),
  })

describe('useLanguageService', () => {
  it('starts the language service on the files of the project', async () => {
    const languageService = makeLanguageServiceInMemory()
    const { result } = renderLanguageService(languageService.layer)

    await waitFor(() => expect(result.current.status).toBe('ready'))
    const info = await Effect.runPromise(
      result.current.session?.quickInfo('src/main.ts', 'const '.length) ?? Effect.succeed(undefined)
    )

    expect(info).toMatchObject({ signature: 'const total: number' })
    expect(Object.keys(languageService.started[0] ?? {})).toContain('src/main.ts')
  })

  it('is starting while the language service is not ready', () => {
    const { result } = renderLanguageService(Layer.succeed(LanguageServicePort, { start: () => Effect.never }))

    expect(result.current).toEqual({ session: undefined, status: 'starting' })
  })

  it('is unavailable without a session when the language service cannot start', async () => {
    const { result } = renderLanguageService(
      Layer.succeed(LanguageServicePort, {
        start: () => Effect.fail(new EditorLanguageServiceError({ cause: 'blocked' })),
      })
    )

    await waitFor(() => expect(result.current).toEqual({ session: undefined, status: 'unavailable' }))
  })

  it('stays off for a template that TypeScript does not analyze', async () => {
    const languageService = makeLanguageServiceInMemory()
    const { result } = renderLanguageService(languageService.layer, 'sample-go')

    await waitFor(() => expect(result.current.status).toBe('off'))
    expect(result.current.session).toBeUndefined()
    expect(languageService.started).toEqual([])
  })
})

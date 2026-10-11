import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectFixture } from '../../../../runtime/__tests__/runtime.factory.ts'
import { makeLanguageServiceInMemory } from '../../editor.test-layer.ts'
import { startLanguageServiceProgram } from './start-language-service.program.ts'

describe('startLanguageServiceProgram', () => {
  it('starts the language service on the source and configuration files of the project', async () => {
    const languageService = makeLanguageServiceInMemory()
    const snapshot = projectFixture({
      'tsconfig.json': '{}',
      'src/main.ts': 'export {}\n',
      'README.md': '# Sample\n',
      'assets/logo.png': new Uint8Array([1, 2, 3]),
    })

    await Effect.runPromise(
      Effect.scoped(startLanguageServiceProgram(snapshot)).pipe(Effect.provide(languageService.layer))
    )

    expect(languageService.started).toEqual([{ 'tsconfig.json': '{}', 'src/main.ts': 'export {}\n' }])
  })
})

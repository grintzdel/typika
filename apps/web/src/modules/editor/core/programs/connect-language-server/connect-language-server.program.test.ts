import type { LanguageServer } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { describe, expect, it } from 'vitest'

import { projectFixture } from '../../../../runtime/__tests__/runtime.factory.ts'
import { makeLanguageServiceInMemory } from '../../editor.test-layer.ts'
import { connectLanguageServerProgram } from './connect-language-server.program.ts'

const SERVER: LanguageServer = { rootUri: 'file:///work', connect: Stream.never, send: () => Effect.void }

describe('connectLanguageServerProgram', () => {
  it('connects the language server of the runtime with the text files of the project', async () => {
    const languageService = makeLanguageServiceInMemory()
    const snapshot = projectFixture({
      'go.mod': 'module shop\n',
      'main.go': 'package main\n',
      'assets/logo.png': new Uint8Array([1, 2, 3]),
    })

    await Effect.runPromise(
      Effect.scoped(connectLanguageServerProgram(SERVER, snapshot)).pipe(Effect.provide(languageService.layer))
    )

    expect(languageService.connected.map(({ rootUri }) => rootUri)).toEqual(['file:///work'])
    expect(languageService.connected[0]?.files).toMatchObject({
      'go.mod': 'module shop\n',
      'main.go': 'package main\n',
    })
    expect(Object.keys(languageService.connected[0]?.files ?? {}).toSorted()).toEqual([
      'go.mod',
      'main.go',
      'typika.toml',
    ])
  })
})

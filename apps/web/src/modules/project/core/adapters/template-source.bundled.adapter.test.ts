import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { templateToml } from '../../__tests__/template.factory.ts'
import { makeTemplateSourceBundled } from './template-source.bundled.adapter.ts'

const source = makeTemplateSourceBundled({
  '../templates/strategy/ts/typika.toml': templateToml('strategy-ts'),
  '../templates/strategy/ts/src/main.ts': 'ts',
  '../templates/strategy/go/typika.toml': templateToml('strategy-go'),
  '../templates/strategy/go/main.go': 'go',
})

describe('bundled template source', () => {
  it('finds a template by its manifest name, with paths relative to its folder', async () => {
    const files = await Effect.runPromise(source.load('strategy-ts'))

    expect(Object.fromEntries(files)).toEqual({ 'typika.toml': templateToml('strategy-ts'), 'src/main.ts': 'ts' })
  })

  it('fails for an unknown template', async () => {
    const exit = await Effect.runPromiseExit(source.load('observer-ts'))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateNotFoundError', name: 'observer-ts' },
    })
  })
})

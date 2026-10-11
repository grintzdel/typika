import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { templateToml } from '../../__tests__/template.factory.ts'
import { makeTemplateSourceBundled } from './template-source.bundled.adapter.ts'

const source = makeTemplateSourceBundled({
  '../templates/strategy-base/ts/typika.toml': templateToml('strategy-base-ts'),
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

  it('lists the names of the templates', async () => {
    expect(await Effect.runPromise(source.names)).toEqual(['strategy-base-ts', 'strategy-go', 'strategy-ts'])
  })

  it('resolves an official template ref to the embedded template', async () => {
    expect(await Effect.runPromise(source.resolveRef('github:typika/templates/strategy-base/ts'))).toBe(
      'strategy-base-ts'
    )
  })

  it('fails for a ref that is not embedded', async () => {
    const results = await Promise.all(
      ['github:typika/templates/observer/ts', 'github:someone/templates/strategy/ts', 'not a ref'].map((ref) =>
        Effect.runPromiseExit(source.resolveRef(ref))
      )
    )

    expect(results.map((exit) => Exit.isFailure(exit) && exit.cause.reasons[0])).toMatchObject([
      { error: { _tag: 'ProjectTemplateNotFoundError', name: 'github:typika/templates/observer/ts' } },
      { error: { _tag: 'ProjectTemplateNotFoundError', name: 'github:someone/templates/strategy/ts' } },
      { error: { _tag: 'ProjectTemplateNotFoundError', name: 'not a ref' } },
    ])
  })
})

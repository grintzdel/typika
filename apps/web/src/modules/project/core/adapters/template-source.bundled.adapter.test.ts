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
  it('indexes each embedded template under its official ref', async () => {
    const entries = await Effect.runPromise(source.index.entries)

    expect(entries.map(({ name, ref }) => ({ name, ref }))).toEqual([
      { name: 'strategy-base-ts', ref: 'github:typika/templates/strategy-base/ts' },
      { name: 'strategy-go', ref: 'github:typika/templates/strategy/go' },
      { name: 'strategy-ts', ref: 'github:typika/templates/strategy/ts' },
    ])
  })

  it('loads the files of a template by its ref, with paths relative to its folder', async () => {
    const files = await Effect.runPromise(source.files.load('github:typika/templates/strategy/ts@0123456789ab'))

    expect(Object.fromEntries(files)).toEqual({ 'typika.toml': templateToml('strategy-ts'), 'src/main.ts': 'ts' })
  })

  it('fails for a ref that is not embedded', async () => {
    const results = await Promise.all(
      ['github:typika/templates/observer/ts', 'github:someone/templates/strategy/ts', 'not a ref'].map((ref) =>
        Effect.runPromiseExit(source.files.load(ref))
      )
    )

    expect(results.map((exit) => Exit.isFailure(exit) && exit.cause.reasons[0])).toMatchObject([
      { error: { _tag: 'ProjectFilesUnavailableError', ref: 'github:typika/templates/observer/ts' } },
      { error: { _tag: 'ProjectFilesUnavailableError', ref: 'github:someone/templates/strategy/ts' } },
      { error: { _tag: 'ProjectFilesUnavailableError', ref: 'not a ref' } },
    ])
  })
})

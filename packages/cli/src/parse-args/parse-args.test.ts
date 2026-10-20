import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { DEFAULT_INDEX_URL } from '../template-source/template-source.ts'
import { parseCliArgs } from './parse-args.ts'

const parsed = (args: ReadonlyArray<string>) => Effect.runSync(Effect.result(parseCliArgs(args)))

describe('parseCliArgs', () => {
  it('reads create with its template, directory and options', () => {
    const result = parsed(['create', 'strategy-ts', 'shop', '--variant', 'go', '--exercise', 'fix-it', '--keep-tour'])

    expect(result._tag === 'Success' && result.success).toMatchObject({
      _tag: 'Create',
      template: 'strategy-ts',
      dir: 'shop',
      variant: 'go',
      exercise: 'fix-it',
      keepTour: true,
      force: false,
      registry: DEFAULT_INDEX_URL,
    })
  })

  it('accepts --no-install', () => {
    expect(parsed(['create', 'strategy-ts', '--no-install'])._tag).toBe('Success')
  })

  it('reads validate with the current directory by default', () => {
    const result = parsed(['validate', '--run', '--kotlin-compiler', 'http://localhost:3080'])

    expect(result._tag === 'Success' && result.success).toMatchObject({
      _tag: 'Validate',
      dir: '.',
      run: true,
      kotlinCompiler: 'http://localhost:3080',
    })
  })

  it.each([
    [['create']],
    [['create', 'strategy-ts', '--variant', 'cobol']],
    [['create', 'strategy-ts', 'a', 'b']],
    [['create', 'strategy-ts', '--unknown']],
    [['deploy']],
    [[]],
  ])('rejects %j with ArgsInvalidError', (args) => {
    const result = parsed(args)

    expect(result._tag === 'Failure' && result.failure._tag).toBe('ArgsInvalidError')
  })
})

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { templateFiles } from '../../../__tests__/template.factory.ts'
import { makeProjectTestLayer } from '../../project.test-layer.ts'
import { openBaseProgram } from './open-base.program.ts'

const BASE_REF = 'github:typika/templates/sample-base/ts'

const open = (base: { readonly template: string; readonly focus?: ReadonlyArray<string> }) =>
  Effect.runPromiseExit(
    openBaseProgram(base).pipe(
      Effect.provide(makeProjectTestLayer({ 'sample-base-ts': templateFiles('sample-base-ts') }))
    )
  )

describe('openBaseProgram', () => {
  it('opens the files of the base with its name and the focus', async () => {
    const exit = await open({ template: BASE_REF, focus: ['src/**'] })

    expect(Exit.isSuccess(exit) && exit.value.name).toBe('sample-base-ts')
    expect(Exit.isSuccess(exit) && exit.value.focus).toEqual(['src/**'])
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
    expect(Exit.isSuccess(exit) && [...exit.value.files.keys()].some((path) => path.startsWith('exercises/'))).toBe(
      false
    )
  })

  it('fails when the base is not embedded', async () => {
    const exit = await open({ template: 'github:typika/templates/missing/ts' })

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateNotFoundError' },
    })
  })
})

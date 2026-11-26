import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { LOCATED_DIAGNOSTIC, makeFakeRuntime, projectFixture, projectPath } from '../../../__tests__/runtime.factory.ts'
import { checkProjectProgram } from './check-project.program.ts'

const checkWith = (canCheck: boolean, content: string) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.flatMap(makeFakeRuntime({ canCheck }).port.boot(projectFixture()), (session) =>
        checkProjectProgram(session, [[projectPath('src/main.ts'), content]])
      )
    )
  )

describe('checkProjectProgram', () => {
  it('writes the pending files, then checks them', async () => {
    expect(await checkWith(true, 'syntax error')).toEqual([LOCATED_DIAGNOSTIC])
  })

  it('checks nothing with a runtime that cannot check', async () => {
    expect(await checkWith(false, 'syntax error')).toBeUndefined()
  })
})

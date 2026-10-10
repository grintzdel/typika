import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'
import { describe, expect, it } from 'vitest'

import { makeFakeRuntime, projectFixture } from '../../../__tests__/runtime.factory.ts'
import { testProjectProgram } from './test-project.program.ts'

describe('testProjectProgram', () => {
  it('accumulates the test events of the run', async () => {
    const states = await Effect.runPromise(
      Effect.scoped(
        Effect.flatMap(makeFakeRuntime().port.boot(projectFixture()), (session) =>
          Stream.runCollect(testProjectProgram({ session, writes: [] }))
        )
      )
    )

    expect(states.at(-1)).toMatchObject({
      outcome: { _tag: 'Finished', status: 'passed' },
      counts: { passed: 1, failed: 0, skipped: 0 },
      tests: [{ name: 'adds', status: 'passed' }],
    })
  })
})

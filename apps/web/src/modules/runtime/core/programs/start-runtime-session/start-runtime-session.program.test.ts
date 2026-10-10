import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { makeFakeRuntime, projectFixture } from '../../../__tests__/runtime.factory.ts'
import { makeRuntimeTestLayer } from '../../runtime.test-layer.ts'
import { startRuntimeSessionProgram } from './start-runtime-session.program.ts'

describe('startRuntimeSessionProgram', () => {
  it('boots a session for the project and closes it with the scope', async () => {
    const fake = makeFakeRuntime()

    await Effect.runPromise(
      Effect.scoped(startRuntimeSessionProgram(projectFixture())).pipe(Effect.provide(makeRuntimeTestLayer(fake.port)))
    )

    expect(fake.journal).toEqual(['booted', 'closed'])
  })
})

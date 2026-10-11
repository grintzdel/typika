import * as Effect from 'effect/Effect'

import { ExerciseProgressPort } from '../../ports/exercise-progress.port.ts'

export const markSolvedProgram = (template: string, exercise: string) =>
  Effect.gen(function* () {
    const progress = yield* ExerciseProgressPort
    yield* progress.markSolved(template, exercise)
  })

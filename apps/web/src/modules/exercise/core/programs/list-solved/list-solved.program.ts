import * as Effect from 'effect/Effect'

import { ExerciseProgressPort } from '../../ports/exercise-progress.port.ts'

export const listSolvedProgram = (template: string) =>
  Effect.gen(function* () {
    const progress = yield* ExerciseProgressPort
    return yield* progress.solved(template)
  })

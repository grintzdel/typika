import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { ExerciseProgressPort } from './ports/exercise-progress.port.ts'

export const makeExerciseProgressInMemory = (initial: Readonly<Record<string, ReadonlyArray<string>>> = {}) => {
  const solved = new Map(Object.entries(initial))
  const layer = Layer.succeed(ExerciseProgressPort, {
    solved: (template) => Effect.sync(() => solved.get(template) ?? []),
    markSolved: (template, exercise) =>
      Effect.sync(() => {
        const current = solved.get(template) ?? []
        if (!current.includes(exercise)) solved.set(template, [...current, exercise])
      }),
  })
  return { solved, layer }
}

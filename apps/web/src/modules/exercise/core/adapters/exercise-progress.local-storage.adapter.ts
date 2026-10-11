import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import { ExerciseProgressPort } from '../ports/exercise-progress.port.ts'

const KEY_PREFIX = 'typika:solved-exercises:'
const decodeSolved = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(Schema.String)))

export const makeExerciseProgressLocalStorage = (
  storage: Storage
): Context.Service.Shape<typeof ExerciseProgressPort> => {
  const read = (template: string): ReadonlyArray<string> => {
    const decoded = decodeSolved(storage.getItem(`${KEY_PREFIX}${template}`) ?? '[]')
    return decoded._tag === 'Some' ? decoded.value : []
  }

  return {
    solved: (template) => Effect.try(() => read(template)).pipe(Effect.orElseSucceed(() => [])),
    markSolved: (template, exercise) =>
      Effect.try(() => {
        const solved = read(template)
        if (!solved.includes(exercise))
          storage.setItem(`${KEY_PREFIX}${template}`, JSON.stringify([...solved, exercise]))
      }).pipe(Effect.ignore),
  }
}

export const ExerciseProgressLocalStorageLayer = Layer.sync(ExerciseProgressPort, () =>
  makeExerciseProgressLocalStorage(globalThis.localStorage)
)

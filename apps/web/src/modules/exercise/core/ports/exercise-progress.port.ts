import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class ExerciseProgressPort extends Context.Service<
  ExerciseProgressPort,
  {
    readonly solved: (template: string) => Effect.Effect<ReadonlyArray<string>>
    readonly markSolved: (template: string, exercise: string) => Effect.Effect<void>
  }
>()('@typika/web/ExerciseProgressPort') {}

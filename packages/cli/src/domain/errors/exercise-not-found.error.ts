import * as Data from 'effect/Data'

export class ExerciseNotFoundError extends Data.TaggedError('ExerciseNotFoundError')<{
  readonly template: string
  readonly exercise: string
}> {}

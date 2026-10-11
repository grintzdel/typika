import * as Data from 'effect/Data'

export class ExerciseBaseMissingError extends Data.TaggedError('ExerciseBaseMissingError')<{
  readonly exercise: string
}> {}

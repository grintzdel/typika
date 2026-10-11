import * as Data from 'effect/Data'

export class ProjectExerciseNotFoundError extends Data.TaggedError('ProjectExerciseNotFoundError')<{
  readonly name: string
  readonly exercise: string
}> {}

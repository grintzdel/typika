import * as Data from 'effect/Data'

export class ProjectStorageError extends Data.TaggedError('ProjectStorageError')<{
  readonly cause: unknown
}> {}

import * as Data from 'effect/Data'

export class ProjectNotFoundError extends Data.TaggedError('ProjectNotFoundError')<{
  readonly id: string
}> {}

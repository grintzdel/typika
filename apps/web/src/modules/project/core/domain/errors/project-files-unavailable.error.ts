import * as Data from 'effect/Data'

export class ProjectFilesUnavailableError extends Data.TaggedError('ProjectFilesUnavailableError')<{
  readonly ref: string
  readonly reason: string
}> {}

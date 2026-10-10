import * as Data from 'effect/Data'

export class ProjectTemplateNotFoundError extends Data.TaggedError('ProjectTemplateNotFoundError')<{
  readonly name: string
}> {}

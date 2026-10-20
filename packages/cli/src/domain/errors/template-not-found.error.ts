import * as Data from 'effect/Data'

export class TemplateNotFoundError extends Data.TaggedError('TemplateNotFoundError')<{
  readonly template: string
}> {}

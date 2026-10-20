import * as Data from 'effect/Data'

export class VariantNotFoundError extends Data.TaggedError('VariantNotFoundError')<{
  readonly template: string
  readonly language: string
}> {}

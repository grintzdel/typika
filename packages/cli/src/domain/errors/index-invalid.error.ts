import * as Data from 'effect/Data'

export class IndexInvalidError extends Data.TaggedError('IndexInvalidError')<{
  readonly url: string
}> {}

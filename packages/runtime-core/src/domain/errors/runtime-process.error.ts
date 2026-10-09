import * as Data from 'effect/Data'

export class RuntimeProcessError extends Data.TaggedError('RuntimeProcessError')<{
  readonly cause: unknown
}> {}

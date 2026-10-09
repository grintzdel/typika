import * as Data from 'effect/Data'

export class RuntimeTimeoutError extends Data.TaggedError('RuntimeTimeoutError')<{
  readonly limitMs: number
}> {}

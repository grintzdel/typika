import * as Data from 'effect/Data'

export class RuntimeFrameUnavailableError extends Data.TaggedError('RuntimeFrameUnavailableError')<{
  readonly cause: unknown
}> {}

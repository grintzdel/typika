import * as Data from 'effect/Data'

export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly url: string
  readonly reason: string
}> {}

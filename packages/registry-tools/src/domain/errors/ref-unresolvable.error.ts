import * as Data from 'effect/Data'

export class RefUnresolvableError extends Data.TaggedError('RefUnresolvableError')<{
  readonly reason: string
}> {}

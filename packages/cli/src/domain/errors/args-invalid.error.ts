import * as Data from 'effect/Data'

export class ArgsInvalidError extends Data.TaggedError('ArgsInvalidError')<{
  readonly message: string
}> {}

import * as Data from 'effect/Data'

export class AppConfigInvalidError extends Data.TaggedError('AppConfigInvalidError')<{
  readonly reason: string
}> {}

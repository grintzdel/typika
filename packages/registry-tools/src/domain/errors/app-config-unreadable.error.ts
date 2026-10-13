import * as Data from 'effect/Data'

export class AppConfigUnreadableError extends Data.TaggedError('AppConfigUnreadableError')<{
  readonly reason: string
}> {}

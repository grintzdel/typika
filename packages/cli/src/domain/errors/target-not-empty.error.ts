import * as Data from 'effect/Data'

export class TargetNotEmptyError extends Data.TaggedError('TargetNotEmptyError')<{
  readonly dir: string
}> {}

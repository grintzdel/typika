import * as Data from 'effect/Data'

export class RuntimeFsError extends Data.TaggedError('RuntimeFsError')<{
  readonly path: string
  readonly reason: string
}> {}

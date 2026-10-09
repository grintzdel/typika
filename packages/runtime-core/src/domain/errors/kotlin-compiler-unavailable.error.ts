import * as Data from 'effect/Data'

export class KotlinCompilerUnavailableError extends Data.TaggedError('KotlinCompilerUnavailableError')<{
  readonly cause: unknown
}> {}

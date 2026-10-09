import * as Data from 'effect/Data'

export class KotlinCompilerRateLimitedError extends Data.TaggedError('KotlinCompilerRateLimitedError')<{
  readonly retryAfterSeconds: number
}> {}

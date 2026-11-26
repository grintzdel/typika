import * as Data from 'effect/Data'

export class ProjectSourceUnavailableError extends Data.TaggedError('ProjectSourceUnavailableError')<{
  readonly reason: 'not-found' | 'rate-limited' | 'too-large' | 'unavailable'
}> {}

import * as Data from 'effect/Data'

export class GistUnavailableError extends Data.TaggedError('GistUnavailableError')<{
  readonly reason: 'not-found' | 'rate-limited' | 'unavailable' | 'invalid' | 'newer' | 'origin'
}> {}

import * as Data from 'effect/Data'

export class GitHubApiError extends Data.TaggedError('GitHubApiError')<{
  readonly reason:
    | 'unauthorized'
    | 'not-found'
    | 'rate-limited'
    | 'unavailable'
    | 'invalid'
    | 'conflict'
    | 'unprocessable'
    | 'name-taken'
    | 'incomplete'
}> {}

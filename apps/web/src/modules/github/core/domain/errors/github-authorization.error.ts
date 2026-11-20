import * as Data from 'effect/Data'

export class GitHubAuthorizationError extends Data.TaggedError('GitHubAuthorizationError')<{
  readonly reason: 'disabled' | 'denied' | 'state' | 'exchange' | 'required'
}> {}

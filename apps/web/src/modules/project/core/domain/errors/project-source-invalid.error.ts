import * as Data from 'effect/Data'

export class ProjectSourceInvalidError extends Data.TaggedError('ProjectSourceInvalidError')<{
  readonly reason: 'url' | 'archive' | 'too-large'
}> {}

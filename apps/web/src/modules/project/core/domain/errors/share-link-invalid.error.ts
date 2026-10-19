import * as Data from 'effect/Data'

export class ShareLinkInvalidError extends Data.TaggedError('ShareLinkInvalidError')<{
  readonly reason: 'invalid' | 'newer' | 'origin'
}> {}

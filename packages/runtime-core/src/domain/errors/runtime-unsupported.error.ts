import type { RuntimeKind } from '@typika/manifest'
import * as Data from 'effect/Data'

export class RuntimeUnsupportedError extends Data.TaggedError('RuntimeUnsupportedError')<{
  readonly kind: RuntimeKind
}> {}

import type { RuntimeKind } from '@typika/manifest'
import * as Data from 'effect/Data'

export class RuntimeBootError extends Data.TaggedError('RuntimeBootError')<{
  readonly kind: RuntimeKind
  readonly cause: unknown
}> {}

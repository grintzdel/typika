import * as Data from 'effect/Data'

import type { Diagnostic } from '../test-event.domain-model.ts'

export class RuntimeCompileError extends Data.TaggedError('RuntimeCompileError')<{
  readonly diagnostics: ReadonlyArray<Diagnostic>
}> {}

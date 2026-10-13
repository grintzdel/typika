import type { Diagnostic } from '@typika/runtime-core'
import * as Data from 'effect/Data'

export class KotlinArtifactFailedError extends Data.TaggedError('KotlinArtifactFailedError')<{
  readonly template: string
  readonly mode: string
  readonly diagnostics: ReadonlyArray<Diagnostic>
}> {}

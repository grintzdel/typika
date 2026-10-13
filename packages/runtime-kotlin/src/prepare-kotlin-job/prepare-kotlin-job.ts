import { RunStatus, type Diagnostic, type TestEvent } from '@typika/runtime-core'

import type { KotlinArtifact, KotlinSourceFile } from '../domain/compile-protocol.domain-model.ts'
import type { KotlinTestJob } from '../domain/kotlin-job.domain-model.ts'
import { findKotlinClasses } from '../kotlin-sources/kotlin-sources.ts'

export type KotlinTestSelection = {
  readonly runId: string
  readonly files?: ReadonlyArray<string>
  readonly namePattern?: string
}

export const prepareKotlinTestJob = (
  sources: ReadonlyArray<KotlinSourceFile>,
  artifact: KotlinArtifact,
  warnings: ReadonlyArray<Diagnostic>,
  selection: KotlinTestSelection
): KotlinTestJob => ({
  runId: selection.runId,
  artifact,
  projectFiles: sources.map((source) => source.path),
  classes: [...findKotlinClasses(sources)],
  warnings,
  ...(selection.files === undefined ? {} : { files: selection.files }),
  ...(selection.namePattern === undefined ? {} : { namePattern: selection.namePattern }),
})

export const compileFailureEvents = (
  runId: string,
  diagnostics: ReadonlyArray<Diagnostic>
): ReadonlyArray<TestEvent> => [
  { _tag: 'RunStarted', runId, startedAt: Date.now() },
  { _tag: 'Diagnostics', runId, diagnostics },
  { _tag: 'RunFinished', runId, status: RunStatus.ERRORED, passed: 0, failed: 0, skipped: 0, durationMs: 0 },
]

import type { ProcessOutput, RuntimeProcessError, TestEvent } from '@typika/runtime-core'
import type * as Effect from 'effect/Effect'
import type * as Scope from 'effect/Scope'

import type { KotlinProgramJob, KotlinTestJob } from './kotlin-job.domain-model.ts'

export type KotlinExecutor = {
  readonly tests: (
    job: KotlinTestJob,
    emit: (event: TestEvent) => void
  ) => Effect.Effect<void, RuntimeProcessError, Scope.Scope>
  readonly program: (
    job: KotlinProgramJob,
    emit: (output: ProcessOutput) => void
  ) => Effect.Effect<void, RuntimeProcessError, Scope.Scope>
}

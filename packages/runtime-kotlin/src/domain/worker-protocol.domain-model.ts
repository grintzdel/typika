import type { ProcessOutput, TestEvent } from '@typika/runtime-core'

import type { KotlinProgramJob, KotlinTestJob } from './kotlin-job.domain-model.ts'

export type KotlinWorkerInput =
  | { readonly _tag: 'Test'; readonly job: KotlinTestJob }
  | { readonly _tag: 'Run'; readonly job: KotlinProgramJob }

export type KotlinWorkerOutput =
  | { readonly _tag: 'TestEvent'; readonly event: TestEvent }
  | { readonly _tag: 'Output'; readonly output: ProcessOutput }
  | { readonly _tag: 'Done' }
  | { readonly _tag: 'Crashed'; readonly message: string }

import { RuntimeProcessError } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import type { KotlinExecutor } from '../domain/kotlin-executor.port.ts'
import { executeKotlinProgram, executeKotlinTests } from '../execute-kotlin/execute-kotlin.ts'
import { loadKotlinModuleInVm } from './load-kotlin-module-in-vm.ts'

const processError = (cause: unknown) => new RuntimeProcessError({ cause })

export const inProcessKotlinExecutor: KotlinExecutor = {
  tests: (job, emit) =>
    Effect.tryPromise({ try: () => executeKotlinTests(job, loadKotlinModuleInVm, emit), catch: processError }),
  program: (job, emit) =>
    Effect.tryPromise({ try: () => executeKotlinProgram(job, loadKotlinModuleInVm, emit), catch: processError }),
}

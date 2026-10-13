import type { ProcessOutput, TestEvent } from '@typika/runtime-core'

import type { KotlinModuleLoader, KotlinProgramJob, KotlinTestJob } from '../domain/kotlin-job.domain-model.ts'
import { makeStackMapper } from '../map-stack/map-stack.ts'
import { runKotlinProgram } from '../run-kotlin-program/run-kotlin-program.ts'
import { runKotlinTests } from '../run-kotlin-tests/run-kotlin-tests.ts'

const withModule = async (
  job: KotlinProgramJob,
  loader: KotlinModuleLoader,
  use: (module: ReturnType<KotlinModuleLoader>, mapStack: ReturnType<typeof makeStackMapper>) => Promise<void>
) => {
  const module = loader(job.artifact.code)
  try {
    await use(
      module,
      makeStackMapper({
        sourceMap: job.artifact.sourceMap,
        moduleUrl: module.moduleUrl,
        projectFiles: job.projectFiles,
      })
    )
  } finally {
    module.dispose?.()
  }
}

export const executeKotlinTests = (job: KotlinTestJob, loader: KotlinModuleLoader, emit: (event: TestEvent) => void) =>
  withModule(job, loader, (module, mapStack) =>
    runKotlinTests({
      runId: job.runId,
      load: module.load,
      mapStack,
      classes: new Map(job.classes),
      warnings: job.warnings,
      ...(job.files === undefined ? {} : { files: job.files }),
      ...(job.namePattern === undefined ? {} : { namePattern: job.namePattern }),
      emit,
    })
  )

export const executeKotlinProgram = (
  job: KotlinProgramJob,
  loader: KotlinModuleLoader,
  emit: (output: ProcessOutput) => void
) => withModule(job, loader, (module, mapStack) => runKotlinProgram({ load: module.load, mapStack, emit }))

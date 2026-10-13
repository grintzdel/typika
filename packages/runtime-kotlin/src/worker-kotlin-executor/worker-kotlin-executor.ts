import { RuntimeProcessError, type ProcessOutput, type TestEvent } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import type { KotlinExecutor } from '../domain/kotlin-executor.port.ts'
import type { KotlinWorkerInput, KotlinWorkerOutput } from '../domain/worker-protocol.domain-model.ts'

type Emitted = {
  readonly onTestEvent?: (event: TestEvent) => void
  readonly onOutput?: (output: ProcessOutput) => void
}

const spawnWorker = Effect.acquireRelease(
  Effect.sync(() => new Worker(new URL('../kotlin-worker/kotlin.worker.ts', import.meta.url), { type: 'module' })),
  (worker) => Effect.sync(() => worker.terminate())
)

const runInWorker = (input: KotlinWorkerInput, { onTestEvent, onOutput }: Emitted) =>
  Effect.flatMap(spawnWorker, (worker) =>
    Effect.callback<void, RuntimeProcessError>((resume) => {
      worker.addEventListener('message', (event: MessageEvent<KotlinWorkerOutput>) => {
        const output = event.data
        if (output._tag === 'TestEvent') onTestEvent?.(output.event)
        if (output._tag === 'Output') onOutput?.(output.output)
        if (output._tag === 'Done') resume(Effect.void)
        if (output._tag === 'Crashed') resume(Effect.fail(new RuntimeProcessError({ cause: output.message })))
      })
      worker.addEventListener('error', (event) => {
        event.preventDefault()
        resume(Effect.fail(new RuntimeProcessError({ cause: event.message || 'The Kotlin worker crashed' })))
      })
      worker.postMessage(input, [])
    })
  )

export const workerKotlinExecutor: KotlinExecutor = {
  tests: (job, emit) => runInWorker({ _tag: 'Test', job }, { onTestEvent: emit }),
  program: (job, emit) => runInWorker({ _tag: 'Run', job }, { onOutput: emit }),
}

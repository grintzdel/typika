import type { KotlinModuleLoader } from '../domain/kotlin-job.domain-model.ts'
import type { KotlinWorkerInput, KotlinWorkerOutput } from '../domain/worker-protocol.domain-model.ts'
import { executeKotlinProgram, executeKotlinTests } from '../execute-kotlin/execute-kotlin.ts'

const post = globalThis.postMessage.bind(globalThis) as (message: KotlinWorkerOutput) => void

const describeError = (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : String(error))

const loadFromBlob: KotlinModuleLoader = (code) => {
  const moduleUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
  return {
    moduleUrl,
    load: async ({ console, ...adapter }) => {
      Object.assign(globalThis, adapter)
      Object.assign(globalThis.console, console)
      await import(/* @vite-ignore */ moduleUrl)
    },
    dispose: () => URL.revokeObjectURL(moduleUrl),
  }
}

const handle = async (message: KotlinWorkerInput) => {
  if (message._tag === 'Test') {
    await executeKotlinTests(message.job, loadFromBlob, (event) => post({ _tag: 'TestEvent', event }))
  } else {
    await executeKotlinProgram(message.job, loadFromBlob, (output) => post({ _tag: 'Output', output }))
  }
  post({ _tag: 'Done' })
}

globalThis.addEventListener('message', (event: MessageEvent<KotlinWorkerInput>) => {
  handle(event.data).catch((error: unknown) => post({ _tag: 'Crashed', message: describeError(error) }))
})

import type { FileContent } from '@typika/runtime-core'

import type {
  BuildWorkerInput,
  BuildWorkerOutput,
  BundleRequest,
  BundleResult,
} from '../domain/worker-protocol.domain-model.ts'

export type BuildClient = {
  readonly bundle: (files: ReadonlyMap<string, FileContent>, request: BundleRequest) => Promise<BundleResult>
  readonly terminate: () => void
}

type Pending = {
  readonly resolve: (result: BundleResult) => void
  readonly reject: (error: unknown) => void
}

const spawn = (wasmModule: WebAssembly.Module, onCrash: (error: unknown) => void) =>
  new Promise<Worker>((resolve, reject) => {
    const worker = new Worker(new URL('../build-worker/build.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('error', (event) => {
      event.preventDefault()
      const error = new Error(event.message || 'The build worker crashed')
      reject(error)
      onCrash(error)
    })
    worker.addEventListener('message', (event: MessageEvent<BuildWorkerOutput>) => {
      if (event.data._tag === 'Ready') resolve(worker)
      if (event.data._tag === 'InitFailed') reject(new Error(event.data.message))
    })
    worker.postMessage({ _tag: 'Init', wasmModule } satisfies BuildWorkerInput)
  })

export const startBuildClient = async (
  wasmModule: WebAssembly.Module,
  packageUrlTemplate: string
): Promise<BuildClient> => {
  const pending = new Map<number, Pending>()
  let nextId = 0
  let worker: Promise<Worker> | undefined

  const crash = (error: unknown) => {
    worker = undefined
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  }

  const listen = (started: Worker) =>
    started.addEventListener('message', (event: MessageEvent<BuildWorkerOutput>) => {
      if (event.data._tag !== 'Bundled') return
      pending.get(event.data.id)?.resolve(event.data.result)
      pending.delete(event.data.id)
    })

  const current = () => {
    worker ??= spawn(wasmModule, crash).then((started) => {
      listen(started)
      return started
    })
    return worker
  }

  await current()

  return {
    bundle: async (files, request) => {
      const started = await current()
      const id = nextId++
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
        started.postMessage({ _tag: 'Bundle', id, files, packageUrlTemplate, request } satisfies BuildWorkerInput)
      })
    },
    terminate: () => {
      void worker?.then((started) => started.terminate())
      crash(new Error('The runtime session is closed'))
    },
  }
}

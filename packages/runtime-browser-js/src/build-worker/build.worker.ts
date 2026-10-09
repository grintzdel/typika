import * as esbuild from 'esbuild-wasm'

import { bundle } from '../bundle/bundle.ts'
import type { BuildWorkerInput, BuildWorkerOutput } from '../domain/worker-protocol.domain-model.ts'

const post = (message: BuildWorkerOutput) => globalThis.postMessage(message)

let ready: Promise<void> | undefined

globalThis.addEventListener('message', (event: MessageEvent<BuildWorkerInput>) => {
  const message = event.data
  if (message._tag === 'Init') {
    ready = esbuild.initialize({ wasmModule: message.wasmModule, worker: false })
    ready.then(
      () => post({ _tag: 'Ready' }),
      (error: unknown) => post({ _tag: 'InitFailed', message: String(error) })
    )
    return
  }
  void Promise.resolve(ready)
    .then(() => bundle(esbuild, message.files, message.request, message.packageUrlTemplate))
    .catch((error: unknown) => ({
      _tag: 'Failed' as const,
      diagnostics: [{ severity: 'error' as const, message: `Internal build error: ${String(error)}` }],
    }))
    .then((result) => post({ _tag: 'Bundled', id: message.id, result }))
})

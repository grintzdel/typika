import type { GoplsAssets } from '../domain/go-assets.domain-model.ts'
import type { GoplsWorkerInput, GoplsWorkerOutput } from '../domain/gopls-worker-protocol.domain-model.ts'
import type { GoplsSpawn } from '../go-language-server/go-language-server.ts'

export const spawnGopls =
  (assets: () => Promise<GoplsAssets>): GoplsSpawn =>
  async (files, events) => {
    const { gopls, sources, packages } = await assets()
    const worker = new Worker(new URL('../gopls-worker/gopls.worker.ts', import.meta.url), { type: 'module' })
    const post = (input: GoplsWorkerInput) => worker.postMessage(input, [])
    worker.addEventListener('message', (event: MessageEvent<GoplsWorkerOutput>) => {
      if (event.data._tag === 'Message') events.onMessage(event.data.message)
      else events.onExit(event.data.reason)
    })
    worker.addEventListener('error', (event) => {
      event.preventDefault()
      events.onExit(event.message || 'The gopls worker crashed')
    })
    post({ _tag: 'Start', gopls, sources, packages, files })
    return {
      send: (message) => post({ _tag: 'Send', message }),
      sync: (next) => post({ _tag: 'Sync', files: next }),
      terminate: () => worker.terminate(),
    }
  }

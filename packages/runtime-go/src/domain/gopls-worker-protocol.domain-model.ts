import type { StdPackages } from './go-list.domain-model.ts'
import type { WorkerFiles } from './worker-protocol.domain-model.ts'

export type GoplsWorkerInput =
  | {
      readonly _tag: 'Start'
      readonly gopls: WebAssembly.Module
      readonly sources: ReadonlyMap<string, Uint8Array>
      readonly packages: StdPackages
      readonly files: WorkerFiles
    }
  | { readonly _tag: 'Sync'; readonly files: WorkerFiles }
  | { readonly _tag: 'Send'; readonly message: string }

export type GoplsWorkerOutput =
  | { readonly _tag: 'Message'; readonly message: string }
  | { readonly _tag: 'Exited'; readonly reason: string }

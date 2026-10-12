import type { Diagnostic, FileContent, TestEvent } from '@typika/runtime-core'

export type WorkerFiles = ReadonlyArray<readonly [string, FileContent]>

export type GoWorkerInput =
  | {
      readonly _tag: 'Init'
      readonly compile: WebAssembly.Module
      readonly link: WebAssembly.Module
      readonly std: Uint8Array
    }
  | {
      readonly _tag: 'Test'
      readonly files: WorkerFiles
      readonly runId: string
      readonly selected?: ReadonlyArray<string>
      readonly namePattern?: string
    }
  | { readonly _tag: 'Run'; readonly files: WorkerFiles; readonly entry: string; readonly args: ReadonlyArray<string> }

export type GoWorkerOutput =
  | { readonly _tag: 'Ready' }
  | { readonly _tag: 'Crashed'; readonly message: string }
  | { readonly _tag: 'TestEvent'; readonly event: TestEvent }
  | { readonly _tag: 'Stdout'; readonly chunk: string }
  | { readonly _tag: 'Stderr'; readonly chunk: string }
  | { readonly _tag: 'Exit'; readonly code: number }
  | { readonly _tag: 'BuildFailed'; readonly diagnostics: ReadonlyArray<Diagnostic> }

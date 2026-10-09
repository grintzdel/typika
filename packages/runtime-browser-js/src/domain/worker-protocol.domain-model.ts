import type { Diagnostic, FileContent } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

export type BundleRequest =
  | { readonly _tag: 'Run'; readonly entry: string }
  | { readonly _tag: 'Test'; readonly files: ReadonlyArray<string> }

export type BundledModule = {
  readonly path: string
  readonly code: string
}

export type BundleResult =
  | { readonly _tag: 'Bundled'; readonly modules: ReadonlyArray<BundledModule> }
  | { readonly _tag: 'Failed'; readonly diagnostics: ReadonlyArray<Diagnostic> }

export type BuildWorkerInput =
  | { readonly _tag: 'Init'; readonly wasmModule: WebAssembly.Module }
  | {
      readonly _tag: 'Bundle'
      readonly id: number
      readonly files: ReadonlyMap<string, FileContent>
      readonly packageUrlTemplate: string
      readonly request: BundleRequest
    }

export type BuildWorkerOutput =
  | { readonly _tag: 'Ready' }
  | { readonly _tag: 'InitFailed'; readonly message: string }
  | { readonly _tag: 'Bundled'; readonly id: number; readonly result: BundleResult }

export type ExecutionWorkerInput =
  | { readonly _tag: 'Run'; readonly code: string }
  | {
      readonly _tag: 'Test'
      readonly runId: string
      readonly modules: ReadonlyArray<BundledModule>
      readonly namePattern?: string
    }

export const ExecutionWorkerOutputSchema = Schema.Union([
  Schema.TaggedStruct('Stdout', { chunk: Schema.String }),
  Schema.TaggedStruct('Stderr', { chunk: Schema.String }),
  Schema.TaggedStruct('Exit', { code: Schema.Int }),
  Schema.TaggedStruct('TestEvent', { line: Schema.String }),
])

export type ExecutionWorkerOutput = typeof ExecutionWorkerOutputSchema.Type

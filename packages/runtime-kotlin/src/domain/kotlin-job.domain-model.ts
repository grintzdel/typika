import type { Diagnostic } from '@typika/runtime-core'

import type { KotlinArtifact } from './compile-protocol.domain-model.ts'
import type { LoadKotlinModule } from './kotlin-module.domain-model.ts'

export type KotlinProgramJob = {
  readonly artifact: KotlinArtifact
  readonly projectFiles: ReadonlyArray<string>
}

export type KotlinTestJob = KotlinProgramJob & {
  readonly runId: string
  readonly classes: ReadonlyArray<readonly [string, string]>
  readonly warnings: ReadonlyArray<Diagnostic>
  readonly files?: ReadonlyArray<string>
  readonly namePattern?: string
}

export type LoadedKotlinModule = {
  readonly moduleUrl: string
  readonly load: LoadKotlinModule
  readonly dispose?: () => void
}

export type KotlinModuleLoader = (code: string) => LoadedKotlinModule

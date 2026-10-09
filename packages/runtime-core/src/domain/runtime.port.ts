import type { RuntimeKind } from '@typika/manifest'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import type * as Scope from 'effect/Scope'
import type * as Stream from 'effect/Stream'

import type { KotlinCompilerRateLimitedError } from './errors/kotlin-compiler-rate-limited.error.ts'
import type { KotlinCompilerUnavailableError } from './errors/kotlin-compiler-unavailable.error.ts'
import type { RuntimeAssetLoadError } from './errors/runtime-asset-load.error.ts'
import type { RuntimeBootError } from './errors/runtime-boot.error.ts'
import type { RuntimeCompileError } from './errors/runtime-compile.error.ts'
import type { RuntimeFsError } from './errors/runtime-fs.error.ts'
import type { RuntimeProcessError } from './errors/runtime-process.error.ts'
import type { RuntimeTimeoutError } from './errors/runtime-timeout.error.ts'
import type { ProcessOutput, RunCommand } from './process.domain-model.ts'
import type { FileContent, ProjectPath, ProjectSnapshot } from './project.domain-model.ts'
import type { TestEvent } from './test-event.domain-model.ts'

export interface RuntimeLoadProgress {
  readonly asset: string
  readonly loadedBytes: number
  readonly totalBytes: number
}

export interface TestOptions {
  readonly files?: ReadonlyArray<ProjectPath>
  readonly namePattern?: string
}

export interface PreviewHandle {
  readonly url: string
  readonly reload: Effect.Effect<void>
}

export type RuntimeExecutionError =
  | RuntimeCompileError
  | RuntimeProcessError
  | RuntimeTimeoutError
  | KotlinCompilerRateLimitedError
  | KotlinCompilerUnavailableError

export interface RuntimeFs {
  readonly writeFile: (path: ProjectPath, content: FileContent) => Effect.Effect<void, RuntimeFsError>
  readonly deleteFile: (path: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly rename: (from: ProjectPath, to: ProjectPath) => Effect.Effect<void, RuntimeFsError>
  readonly sync: (snapshot: ProjectSnapshot) => Effect.Effect<void, RuntimeFsError>
}

export interface RuntimeSession {
  readonly fs: RuntimeFs
  readonly run: (command: RunCommand) => Stream.Stream<ProcessOutput, RuntimeExecutionError>
  readonly test: (options: TestOptions) => Stream.Stream<TestEvent, RuntimeExecutionError>
  readonly preview: Effect.Effect<Option.Option<PreviewHandle>>
}

export interface RuntimePort {
  readonly kind: RuntimeKind
  readonly load: Stream.Stream<RuntimeLoadProgress, RuntimeAssetLoadError>
  readonly boot: (
    snapshot: ProjectSnapshot
  ) => Effect.Effect<RuntimeSession, RuntimeBootError | RuntimeAssetLoadError, Scope.Scope>
}

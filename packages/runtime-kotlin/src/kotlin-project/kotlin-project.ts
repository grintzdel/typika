import {
  RuntimeCompileError,
  type FileContent,
  type ProcessOutput,
  type RuntimeProcessError,
  type TestEvent,
} from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import type * as Scope from 'effect/Scope'

import { KotlinCompileMode } from '../domain/constants/kotlin-compile-mode.constant.ts'
import type { KotlinExecutor } from '../domain/kotlin-executor.port.ts'
import type { KotlinCompilerClient, KotlinCompilerError } from '../kotlin-compiler-client/kotlin-compiler-client.ts'
import { DEFAULT_TEST_GLOBS, kotlinSources } from '../kotlin-sources/kotlin-sources.ts'
import {
  compileFailureEvents,
  prepareKotlinTestJob,
  type KotlinTestSelection,
} from '../prepare-kotlin-job/prepare-kotlin-job.ts'

export type ProjectFiles = Iterable<readonly [string, FileContent]>

export type KotlinProjectTestOptions = KotlinTestSelection & { readonly testGlobs?: ReadonlyArray<string> }

export type KotlinProjectRunOptions = { readonly testGlobs?: ReadonlyArray<string> }

export type KotlinProject = {
  readonly test: (
    files: ProjectFiles,
    options: KotlinProjectTestOptions,
    emit: (event: TestEvent) => void
  ) => Effect.Effect<void, KotlinCompilerError | RuntimeProcessError, Scope.Scope>
  readonly run: (
    files: ProjectFiles,
    options: KotlinProjectRunOptions,
    emit: (output: ProcessOutput) => void
  ) => Effect.Effect<void, KotlinCompilerError | RuntimeProcessError | RuntimeCompileError, Scope.Scope>
}

export const makeKotlinProject = (compiler: KotlinCompilerClient, executor: KotlinExecutor): KotlinProject => ({
  test: (files, options, emit) =>
    Effect.gen(function* () {
      const sources = kotlinSources(files, KotlinCompileMode.TEST, options.testGlobs ?? DEFAULT_TEST_GLOBS)
      const compilation = yield* compiler.compile(KotlinCompileMode.TEST, sources)
      if (compilation._tag === 'Failed') {
        for (const event of compileFailureEvents(options.runId, compilation.diagnostics)) emit(event)
        return
      }
      yield* executor.tests(prepareKotlinTestJob(sources, compilation.artifact, compilation.diagnostics, options), emit)
    }),
  run: (files, options, emit) =>
    Effect.gen(function* () {
      const sources = kotlinSources(files, KotlinCompileMode.RUN, options.testGlobs ?? DEFAULT_TEST_GLOBS)
      const compilation = yield* compiler.compile(KotlinCompileMode.RUN, sources)
      return yield* compilation._tag === 'Failed'
        ? Effect.fail(new RuntimeCompileError({ diagnostics: compilation.diagnostics }))
        : executor.program({ artifact: compilation.artifact, projectFiles: sources.map((source) => source.path) }, emit)
    }),
})

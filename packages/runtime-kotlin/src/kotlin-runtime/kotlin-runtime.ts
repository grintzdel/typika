import {
  makeForegroundExecution,
  makeVirtualFs,
  RuntimeBootError,
  RuntimeLimit,
  type ProcessOutput,
  type RuntimePort,
  type TestEvent,
} from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'

import type { CompileCache } from '../domain/compile-cache.port.ts'
import { makeKotlinCompilerClient } from '../kotlin-compiler-client/kotlin-compiler-client.ts'
import { makeKotlinProject } from '../kotlin-project/kotlin-project.ts'
import { DEFAULT_TEST_GLOBS } from '../kotlin-sources/kotlin-sources.ts'
import { makeMemoryCompileCache } from '../memory-compile-cache/memory-compile-cache.ts'
import { workerKotlinExecutor } from '../worker-kotlin-executor/worker-kotlin-executor.ts'

export type KotlinRuntimeOptions = {
  readonly compilerUrl: string
  readonly cache?: CompileCache
  readonly fetch?: typeof globalThis.fetch
  readonly limits?: {
    readonly runTimeoutMs?: number
    readonly testTimeoutMs?: number
  }
}

const KIND = 'kotlin'

export const makeKotlinRuntime = (options: KotlinRuntimeOptions): RuntimePort => {
  const runTimeoutMs = options.limits?.runTimeoutMs ?? RuntimeLimit.RUN_TIMEOUT_MS
  const testTimeoutMs = options.limits?.testTimeoutMs ?? RuntimeLimit.TEST_RUN_TIMEOUT_MS
  const compiler = makeKotlinCompilerClient({
    url: options.compilerUrl,
    cache: options.cache ?? makeMemoryCompileCache(RuntimeLimit.COMPILE_CACHE_BYTES),
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  })
  const project = makeKotlinProject(compiler, workerKotlinExecutor)

  const boot: RuntimePort['boot'] = (snapshot) =>
    Effect.gen(function* () {
      const fs = yield* makeVirtualFs(snapshot.files).pipe(
        Effect.mapError((cause) => new RuntimeBootError({ kind: KIND, cause }))
      )
      const testGlobs = snapshot.manifest.tests?.include ?? DEFAULT_TEST_GLOBS
      const execute = makeForegroundExecution()

      return {
        fs,
        preview: Effect.succeed(Option.none()),
        run: () =>
          execute<ProcessOutput>(runTimeoutMs, (queue) =>
            project
              .run(fs.files(), { testGlobs }, (output) => Queue.offerUnsafe(queue, output))
              .pipe(Effect.andThen(Queue.end(queue)))
          ),
        test: (testOptions) =>
          execute<TestEvent>(testTimeoutMs, (queue) =>
            project
              .test(
                fs.files(),
                {
                  runId: crypto.randomUUID(),
                  testGlobs,
                  ...(testOptions.files === undefined ? {} : { files: testOptions.files }),
                  ...(testOptions.namePattern === undefined ? {} : { namePattern: testOptions.namePattern }),
                },
                (event) => Queue.offerUnsafe(queue, event)
              )
              .pipe(Effect.andThen(Queue.end(queue)))
          ),
      }
    })

  return { kind: KIND, load: Stream.empty, boot }
}

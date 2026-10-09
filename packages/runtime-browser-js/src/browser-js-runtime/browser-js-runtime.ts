import {
  decodeTestEventLine,
  RuntimeAssetLoadError,
  RuntimeBootError,
  RuntimeCompileError,
  RuntimeLimit,
  RuntimeProcessError,
  RuntimeTimeoutError,
  type Diagnostic,
  type ProcessOutput,
  type RuntimeExecutionError,
  type RuntimeLoadProgress,
  type RuntimePort,
  type TestEvent,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Schema from 'effect/Schema'
import type * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'

import {
  ExecutionWorkerOutputSchema,
  type BundleRequest,
  type BundledModule,
  type ExecutionWorkerInput,
  type ExecutionWorkerOutput,
} from '../domain/worker-protocol.domain-model.ts'
import { selectTestFiles } from '../select-test-files/select-test-files.ts'
import { makeVirtualFs } from '../virtual-fs/virtual-fs.ts'
import { startBuildClient } from './build-client.ts'

export type BrowserJsRuntimeOptions = {
  readonly esbuildWasmUrl: string
  readonly esbuildWasmIntegrity?: string
  readonly packageUrlTemplate?: string
  readonly limits?: {
    readonly runTimeoutMs?: number
    readonly testTimeoutMs?: number
  }
}

const DEFAULT_PACKAGE_URL_TEMPLATE = 'https://cdn.jsdelivr.net/npm/{name}@{version}{path}/+esm'
const KIND = 'browser-js'

const fetchWasm = async (
  url: string,
  integrity: string | undefined,
  onProgress: (progress: RuntimeLoadProgress) => void
): Promise<WebAssembly.Module> => {
  const response = await fetch(url, integrity === undefined ? {} : { integrity })
  if (!response.ok || response.body === null) throw new Error(`HTTP ${response.status}`)
  const totalBytes = Number(response.headers.get('content-length') ?? 0)
  const chunks: Array<Uint8Array> = []
  let loadedBytes = 0
  for await (const chunk of response.body) {
    chunks.push(chunk)
    loadedBytes += chunk.length
    onProgress({ asset: url, loadedBytes, totalBytes: Math.max(totalBytes, loadedBytes) })
  }
  const bytes = new Uint8Array(loadedBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return WebAssembly.compile(bytes)
}

const decodeOutput = Schema.decodeUnknownOption(ExecutionWorkerOutputSchema)

const crashInto =
  <A>(queue: Queue.Queue<A, RuntimeExecutionError | Cause.Done>) =>
  (error: RuntimeProcessError) =>
    Queue.failCauseUnsafe(queue, Cause.fail(error))

const spawnExecution = (
  input: ExecutionWorkerInput,
  onOutput: (output: ExecutionWorkerOutput) => void,
  onCrash: (error: RuntimeProcessError) => void
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const worker = new Worker(new URL('../execution-worker/execution.worker.ts', import.meta.url), {
        type: 'module',
      })
      worker.addEventListener('message', (event: MessageEvent<unknown>) =>
        Option.map(decodeOutput(event.data), onOutput)
      )
      worker.addEventListener('error', (event) => {
        event.preventDefault()
        onCrash(new RuntimeProcessError({ cause: event.message || 'The execution worker crashed' }))
      })
      worker.postMessage(input)
      return worker
    }),
    (worker) => Effect.sync(() => worker.terminate())
  )

export const makeBrowserJsRuntime = (options: BrowserJsRuntimeOptions): RuntimePort => {
  const packageUrlTemplate = options.packageUrlTemplate ?? DEFAULT_PACKAGE_URL_TEMPLATE
  const runTimeoutMs = options.limits?.runTimeoutMs ?? RuntimeLimit.RUN_TIMEOUT_MS
  const testTimeoutMs = options.limits?.testTimeoutMs ?? RuntimeLimit.TEST_RUN_TIMEOUT_MS
  let wasm: Promise<WebAssembly.Module> | undefined

  const ensureWasm = (onProgress: (progress: RuntimeLoadProgress) => void = () => {}) =>
    Effect.tryPromise({
      try: () => {
        if (wasm !== undefined) return wasm
        const loading = fetchWasm(options.esbuildWasmUrl, options.esbuildWasmIntegrity, onProgress)
        wasm = loading
        loading.catch(() => {
          if (wasm === loading) wasm = undefined
        })
        return loading
      },
      catch: (cause) => new RuntimeAssetLoadError({ asset: options.esbuildWasmUrl, cause }),
    })

  const load = Stream.callback<RuntimeLoadProgress, RuntimeAssetLoadError>((queue) =>
    ensureWasm((progress) => Queue.offerUnsafe(queue, progress)).pipe(Effect.andThen(Queue.end(queue)))
  )

  const boot: RuntimePort['boot'] = (snapshot) =>
    Effect.gen(function* () {
      const wasmModule = yield* ensureWasm()
      const fs = yield* makeVirtualFs(snapshot.files).pipe(
        Effect.mapError((cause) => new RuntimeBootError({ kind: KIND, cause }))
      )
      let manifest = snapshot.manifest
      const builder = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => startBuildClient(wasmModule, packageUrlTemplate),
          catch: (cause) => new RuntimeBootError({ kind: KIND, cause }),
        }),
        (client) => Effect.sync(() => client.terminate())
      )

      let preemptCurrent: (() => void) | undefined

      const execute = <A>(
        limitMs: number,
        body: (
          queue: Queue.Queue<A, RuntimeExecutionError | Cause.Done>
        ) => Effect.Effect<unknown, RuntimeExecutionError, Scope.Scope>
      ) =>
        Stream.callback<A, RuntimeExecutionError>((queue) =>
          Effect.gen(function* () {
            preemptCurrent?.()
            const preempt = () => Queue.failCauseUnsafe(queue, Cause.interrupt())
            preemptCurrent = preempt
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                if (preemptCurrent === preempt) preemptCurrent = undefined
              })
            )
            yield* Effect.forkScoped(
              Effect.sleep(limitMs).pipe(Effect.andThen(Queue.fail(queue, new RuntimeTimeoutError({ limitMs }))))
            )
            yield* body(queue)
          })
        )

      const bundleFiles = (request: BundleRequest) =>
        Effect.tryPromise({
          try: () => builder.bundle(fs.files(), request),
          catch: (cause) => new RuntimeProcessError({ cause }),
        })

      return {
        fs: {
          ...fs,
          sync: (next) =>
            fs.sync(next).pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  manifest = next.manifest
                })
              )
            ),
        },
        preview: Effect.succeed(Option.none()),
        run: (command) =>
          execute<ProcessOutput>(runTimeoutMs, (queue) =>
            Effect.gen(function* () {
              const result = yield* bundleFiles({ _tag: 'Run', entry: command.command })
              if (result._tag === 'Failed') return yield* new RuntimeCompileError({ diagnostics: result.diagnostics })
              const code = result.modules[0]?.code ?? ''
              return yield* spawnExecution(
                { _tag: 'Run', code },
                (output) => {
                  if (output._tag !== 'TestEvent') Queue.offerUnsafe(queue, output)
                  if (output._tag === 'Exit') Queue.endUnsafe(queue)
                },
                crashInto(queue)
              )
            })
          ),
        test: (testOptions) =>
          execute<TestEvent>(testTimeoutMs, (queue) =>
            Effect.gen(function* () {
              const runId = crypto.randomUUID()
              const files = selectTestFiles({ files: fs.files(), manifest }, testOptions)
              const errored = (diagnostics: ReadonlyArray<Diagnostic>) => {
                Queue.offerAllUnsafe(queue, [
                  { _tag: 'RunStarted', runId, startedAt: Date.now() },
                  { _tag: 'Diagnostics', runId, diagnostics },
                  { _tag: 'RunFinished', runId, status: 'errored', passed: 0, failed: 0, skipped: 0, durationMs: 0 },
                ])
                Queue.endUnsafe(queue)
              }
              if (files.length === 0) return errored([{ severity: 'error', message: 'No test files found' }])
              const result = yield* bundleFiles({ _tag: 'Test', files })
              if (result._tag === 'Failed') return errored(result.diagnostics)
              return yield* spawnExecution(
                {
                  _tag: 'Test',
                  runId,
                  modules: result.modules satisfies ReadonlyArray<BundledModule>,
                  ...(testOptions.namePattern === undefined ? {} : { namePattern: testOptions.namePattern }),
                },
                (output) => {
                  if (output._tag === 'TestEvent') {
                    const event = Effect.runSync(decodeTestEventLine(runId, output.line))
                    Queue.offerUnsafe(queue, event)
                    if (event._tag === 'RunFinished') Queue.endUnsafe(queue)
                  }
                },
                crashInto(queue)
              )
            })
          ),
      }
    })

  return { kind: KIND, load, boot }
}

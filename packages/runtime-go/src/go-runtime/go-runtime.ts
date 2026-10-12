import {
  makeForegroundExecution,
  makeVirtualFs,
  RuntimeAssetLoadError,
  RuntimeBootError,
  RuntimeCompileError,
  RuntimeLimit,
  RuntimeProcessError,
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
import * as Stream from 'effect/Stream'

import type { GoAssetManifest } from '../domain/go-assets.domain-model.ts'
import type { GoWorkerInput, GoWorkerOutput } from '../domain/worker-protocol.domain-model.ts'
import { loadGoAssets, type GoAssetBytes } from '../load-go-assets/load-go-assets.ts'

export { GO_ASSET_CACHE_PREFIX } from '../load-go-assets/load-go-assets.ts'

export type GoRuntimeOptions = {
  readonly assetsUrl: string
  readonly manifest: GoAssetManifest
  readonly limits?: {
    readonly runTimeoutMs?: number
    readonly testTimeoutMs?: number
  }
}

type Listener = (output: GoWorkerOutput) => void

type GoWorker = {
  readonly post: (input: GoWorkerInput) => void
  readonly listen: (listener: Listener, onCrash: (error: RuntimeProcessError) => void) => () => void
  readonly terminate: () => void
}

const KIND = 'go'

const spawnWorker = (assets: GoAssetBytes) =>
  new Promise<GoWorker>((resolve, reject) => {
    const worker = new Worker(new URL('../go-worker/go.worker.ts', import.meta.url), { type: 'module' })
    const listeners = new Set<Listener>()
    const crashes = new Set<(error: RuntimeProcessError) => void>()
    worker.addEventListener('message', (event: MessageEvent<GoWorkerOutput>) => {
      if (event.data._tag === 'Ready') {
        resolve({
          post: (input) => worker.postMessage(input, []),
          listen: (listener, onCrash) => {
            listeners.add(listener)
            crashes.add(onCrash)
            return () => {
              listeners.delete(listener)
              crashes.delete(onCrash)
            }
          },
          terminate: () => worker.terminate(),
        })
        return
      }
      for (const listener of listeners) listener(event.data)
    })
    worker.addEventListener('error', (event) => {
      event.preventDefault()
      const error = new RuntimeProcessError({ cause: event.message || 'The Go worker crashed' })
      reject(error)
      for (const crash of crashes) crash(error)
    })
    worker.postMessage({ _tag: 'Init', ...assets } satisfies GoWorkerInput, [])
  })

export const makeGoRuntime = (options: GoRuntimeOptions): RuntimePort => {
  const runTimeoutMs = options.limits?.runTimeoutMs ?? RuntimeLimit.RUN_TIMEOUT_MS
  const testTimeoutMs = options.limits?.testTimeoutMs ?? RuntimeLimit.TEST_RUN_TIMEOUT_MS
  const progressListeners = new Set<(progress: RuntimeLoadProgress) => void>()
  const latestProgress = new Map<string, RuntimeLoadProgress>()
  let assets: Promise<GoAssetBytes> | undefined

  const ensureAssets = Effect.tryPromise({
    try: () => {
      if (assets !== undefined) return assets
      const loading = loadGoAssets(options.assetsUrl, options.manifest, (progress) => {
        latestProgress.set(progress.asset, progress)
        for (const listener of progressListeners) listener(progress)
      })
      assets = loading
      loading.catch(() => {
        if (assets === loading) assets = undefined
        latestProgress.clear()
      })
      return loading
    },
    catch: (cause) =>
      cause instanceof RuntimeAssetLoadError ? cause : new RuntimeAssetLoadError({ asset: options.assetsUrl, cause }),
  })

  const load = Stream.callback<RuntimeLoadProgress, RuntimeAssetLoadError>((queue) =>
    Effect.gen(function* () {
      const listener = (progress: RuntimeLoadProgress) => Queue.offerUnsafe(queue, progress)
      progressListeners.add(listener)
      yield* Effect.addFinalizer(() => Effect.sync(() => progressListeners.delete(listener)))
      yield* Effect.sync(() => {
        if (assets !== undefined) Queue.offerAllUnsafe(queue, [...latestProgress.values()])
      })
      yield* ensureAssets
      yield* Queue.end(queue)
    })
  )

  const boot: RuntimePort['boot'] = (snapshot) =>
    Effect.gen(function* () {
      const loaded = yield* ensureAssets
      const fs = yield* makeVirtualFs(snapshot.files).pipe(
        Effect.mapError((cause) => new RuntimeBootError({ kind: KIND, cause }))
      )
      let worker: Promise<GoWorker> | undefined

      const stopWorker = () => {
        void worker?.then(
          (started) => started.terminate(),
          () => undefined
        )
        worker = undefined
      }
      yield* Effect.addFinalizer(() => Effect.sync(stopWorker))

      const currentWorker = Effect.tryPromise({
        try: () => {
          worker ??= spawnWorker(loaded)
          const spawning = worker
          spawning.catch(() => {
            if (worker === spawning) worker = undefined
          })
          return spawning
        },
        catch: (cause) => (cause instanceof RuntimeProcessError ? cause : new RuntimeProcessError({ cause })),
      })

      const request = <A>(
        queue: Queue.Queue<A, RuntimeExecutionError | Cause.Done>,
        input: GoWorkerInput,
        onOutput: (output: GoWorkerOutput, settle: () => void) => void
      ) =>
        Effect.gen(function* () {
          const started = yield* currentWorker
          let settled = false
          const settle = () => {
            settled = true
          }
          const crash = (error: RuntimeProcessError) => {
            settle()
            stopWorker()
            Queue.failCauseUnsafe(queue, Cause.fail(error))
          }
          const unlisten = started.listen(
            (output) =>
              output._tag === 'Crashed'
                ? crash(new RuntimeProcessError({ cause: output.message }))
                : onOutput(output, settle),
            crash
          )
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              unlisten()
              if (!settled) stopWorker()
            })
          )
          started.post(input)
        })

      const execute = makeForegroundExecution()
      const filesNow = () => [...fs.files()]

      return {
        fs,
        preview: Effect.succeed(Option.none()),
        run: (command) =>
          execute<ProcessOutput>(runTimeoutMs, (queue) =>
            request(
              queue,
              { _tag: 'Run', files: filesNow(), entry: command.command, args: command.args },
              (output, settle) => {
                if (output._tag === 'Stdout' || output._tag === 'Stderr') Queue.offerUnsafe(queue, output)
                if (output._tag === 'Exit') {
                  settle()
                  Queue.offerUnsafe(queue, output)
                  Queue.endUnsafe(queue)
                }
                if (output._tag === 'BuildFailed') {
                  settle()
                  Queue.failCauseUnsafe(queue, Cause.fail(new RuntimeCompileError({ diagnostics: output.diagnostics })))
                }
              }
            )
          ),
        test: (testOptions) =>
          execute<TestEvent>(testTimeoutMs, (queue) =>
            request(
              queue,
              {
                _tag: 'Test',
                files: filesNow(),
                runId: crypto.randomUUID(),
                ...(testOptions.files === undefined ? {} : { selected: testOptions.files }),
                ...(testOptions.namePattern === undefined ? {} : { namePattern: testOptions.namePattern }),
              },
              (output, settle) => {
                if (output._tag !== 'TestEvent') return
                Queue.offerUnsafe(queue, output.event)
                if (output.event._tag === 'RunFinished') {
                  settle()
                  Queue.endUnsafe(queue)
                }
              }
            )
          ),
      }
    })

  return { kind: KIND, load, boot }
}

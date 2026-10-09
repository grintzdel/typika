import * as vitestApi from '@typika/test-runner'
import { formatLog, runTests } from '@typika/test-runner/runner'

import type { ExecutionWorkerInput, ExecutionWorkerOutput } from '../domain/worker-protocol.domain-model.ts'
import { VITEST_GLOBAL } from '../vitest-shim/vitest-shim.ts'

const post = globalThis.postMessage.bind(globalThis) as (message: ExecutionWorkerOutput) => void
const realSetTimeout = globalThis.setTimeout.bind(globalThis)

const CONSOLE_STREAMS = {
  log: 'Stdout',
  info: 'Stdout',
  debug: 'Stdout',
  warn: 'Stderr',
  error: 'Stderr',
} as const

// Vite rewrites a literal import() whose argument it cannot analyze and pulls its HMR client into the worker.
// oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-type-assertion
const importUrl = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>
const importCode = (code: string) => importUrl(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })))

const describeError = (error: unknown) =>
  error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : `Uncaught ${formatLog([error])}`

const run = async (code: string) => {
  let exited = false
  const exit = (exitCode: number) => {
    if (exited) return
    exited = true
    post({ _tag: 'Exit', code: exitCode })
  }
  const fail = (error: unknown) => {
    post({ _tag: 'Stderr', chunk: `${describeError(error)}\n` })
    exit(1)
  }

  for (const [method, tag] of Object.entries(CONSOLE_STREAMS)) {
    Object.assign(console, {
      [method]: (...args: Array<unknown>) => post({ _tag: tag, chunk: `${formatLog(args)}\n` }),
    })
  }
  globalThis.addEventListener('error', (event) => {
    event.preventDefault()
    fail(event.error)
  })
  globalThis.addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
    fail(event.reason)
  })

  const pending = new Set<unknown>()
  const exitWhenIdle = () =>
    realSetTimeout(() => {
      if (pending.size === 0) exit(0)
    }, 0)
  const realClearTimeout = globalThis.clearTimeout.bind(globalThis)
  const realSetInterval = globalThis.setInterval.bind(globalThis)
  const realClearInterval = globalThis.clearInterval.bind(globalThis)
  Object.assign(globalThis, {
    setTimeout: (handler: unknown, ms?: number, ...args: Array<unknown>) => {
      if (typeof handler !== 'function') return realSetTimeout(String(handler), ms)
      const id = realSetTimeout(() => {
        pending.delete(id)
        try {
          Reflect.apply(handler, undefined, args)
        } finally {
          exitWhenIdle()
        }
      }, ms)
      pending.add(id)
      return id
    },
    clearTimeout: (id: Parameters<typeof clearTimeout>[0]) => {
      pending.delete(id)
      realClearTimeout(id)
      exitWhenIdle()
    },
    setInterval: (handler: unknown, ms?: number, ...args: Array<unknown>) => {
      const id = realSetInterval(
        typeof handler === 'function'
          ? () => {
              Reflect.apply(handler, undefined, args)
            }
          : String(handler),
        ms
      )
      pending.add(id)
      return id
    },
    clearInterval: (id: Parameters<typeof clearInterval>[0]) => {
      pending.delete(id)
      realClearInterval(id)
      exitWhenIdle()
    },
  })

  try {
    await importCode(code)
    exitWhenIdle()
  } catch (error) {
    fail(error)
  }
}

const emitLine = (line: string) => post({ _tag: 'TestEvent', line })

const test = async (message: Extract<ExecutionWorkerInput, { _tag: 'Test' }>) => {
  const { runId, modules, namePattern } = message
  const reportUncaught = (error: unknown) =>
    emitLine(JSON.stringify({ _tag: 'Output', runId, stream: 'stderr', chunk: `${describeError(error)}\n` }))
  globalThis.addEventListener('error', (event) => {
    event.preventDefault()
    reportUncaught(event.error)
  })
  globalThis.addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
    reportUncaught(event.reason)
  })

  Object.assign(globalThis, { [Symbol.for(VITEST_GLOBAL)]: vitestApi })
  await runTests({
    runId,
    files: modules.map((module) => ({ path: module.path, load: () => importCode(module.code) })),
    ...(namePattern === undefined ? {} : { namePattern }),
    emit: (event) => emitLine(JSON.stringify(event)),
  })
}

globalThis.addEventListener(
  'message',
  (event: MessageEvent<ExecutionWorkerInput>) => {
    const message = event.data
    void (message._tag === 'Run' ? run(message.code) : test(message))
  },
  { once: true }
)

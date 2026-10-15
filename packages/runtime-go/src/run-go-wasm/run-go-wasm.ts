import type { MemoryFs, OutputStream } from '../memory-fs/memory-fs.ts'

export type GoProcess = {
  readonly module: WebAssembly.Module
  readonly args: ReadonlyArray<string>
  readonly env?: Readonly<Record<string, string>>
  readonly cwd?: string
  readonly onOutput?: (stream: OutputStream, chunk: Uint8Array) => void
}

export type GoProcessResult = { readonly exitCode: number }

const BASE_ENV = { HOME: '/home', TMPDIR: '/tmp', PATH: '/bin' }

let queue: Promise<unknown> = Promise.resolve()

// wasm_exec.js and syscall/js read the file system from globalThis.fs, so two Go programs cannot run at once.
const exclusively = <A>(task: () => Promise<A>): Promise<A> => {
  const next = queue.then(task, task)
  queue = next.catch(() => undefined)
  return next
}

export const runGoWasm = (fs: MemoryFs, process: GoProcess): Promise<GoProcessResult> =>
  exclusively(async () => {
    await import('../wasm-exec/wasm-exec.js')
    const go = new Go()
    let exitCode = 0
    go.argv = ['main', ...process.args]
    go.env = { ...BASE_ENV, ...process.env }
    go.exit = (code) => {
      exitCode = code
      for (const timeout of go._scheduledTimeouts.values()) clearTimeout(timeout)
      go._scheduledTimeouts.clear()
    }
    const previousFs: unknown = Reflect.get(globalThis, 'fs')
    const previousCwd = fs.cwd()
    fs.chdir(process.cwd ?? '/')
    fs.onOutput(process.onOutput ?? (() => undefined))
    Reflect.set(globalThis, 'fs', fs.api)
    try {
      await go.run(await WebAssembly.instantiate(process.module, go.importObject))
    } finally {
      Reflect.set(globalThis, 'fs', previousFs)
      fs.onOutput(() => undefined)
      fs.chdir(previousCwd)
    }
    return { exitCode }
  })

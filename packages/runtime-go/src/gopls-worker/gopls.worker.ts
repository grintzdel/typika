import { GoplsWorkspace } from '../domain/constants/gopls-workspace.constant.ts'
import type { GoplsWorkerInput, GoplsWorkerOutput } from '../domain/gopls-worker-protocol.domain-model.ts'
import type { WorkerFiles } from '../domain/worker-protocol.domain-model.ts'
import { makeGoCommand } from '../go-command-shim/go-command-shim.ts'
import { frameLspMessage, makeLspReader } from '../lsp-framing/lsp-framing.ts'
import { makeMemoryFs } from '../memory-fs/memory-fs.ts'
import type { ProjectFiles } from '../plan-go-build/plan-go-build.ts'
import { watchedFileChanges } from '../watched-file-changes/watched-file-changes.ts'

type ReadCallback = (error: Error | null, read?: number) => void
type PendingRead = {
  readonly buffer: Uint8Array
  readonly offset: number
  readonly length: number
  readonly callback: ReadCallback
}

const STDERR_TAIL_BYTES = 2_000
const { ROOT, GOROOT, HOME, MEMORY_LIMIT } = GoplsWorkspace

const post = globalThis.postMessage.bind(globalThis) as (message: GoplsWorkerOutput) => void
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const fs = makeMemoryFs()
const reader = makeLspReader((message) => post({ _tag: 'Message', message }))
let project: ProjectFiles = new Map()
let stdin = new Uint8Array(0)
let pendingRead: PendingRead | undefined
let stderrTail = ''

const concat = (a: Uint8Array, b: Uint8Array) => {
  const joined = new Uint8Array(a.byteLength + b.byteLength)
  joined.set(a)
  joined.set(b, a.byteLength)
  return joined
}

const flushStdin = () => {
  const read = pendingRead
  if (read === undefined || stdin.byteLength === 0) return
  pendingRead = undefined
  const count = Math.min(read.length, stdin.byteLength)
  read.buffer.set(stdin.subarray(0, count), read.offset)
  stdin = stdin.slice(count)
  queueMicrotask(() => read.callback(null, count))
}

const writeStdin = (bytes: Uint8Array) => {
  stdin = concat(stdin, bytes)
  flushStdin()
}

// WebKit corrupts the Go stack when syscall/js re-enters the module from a synchronous callback (ADR 0036).
const deferCallbacks = (api: object): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(api).map(([name, value]: [string, unknown]) => [
      name,
      typeof value === 'function'
        ? (...args: Array<unknown>): unknown => {
            const callback = args.at(-1)
            if (typeof callback === 'function') {
              args[args.length - 1] = (...results: Array<unknown>) =>
                queueMicrotask(() => {
                  Reflect.apply(callback, undefined, results)
                })
            }
            return Reflect.apply(value, api, args) as unknown
          }
        : value,
    ])
  )

const syncProject = (files: WorkerFiles) => {
  const next: ProjectFiles = new Map(files)
  const changes = watchedFileChanges(ROOT, project, next)
  for (const path of project.keys()) if (!next.has(path)) fs.removeTree(`${ROOT}/${path}`)
  for (const [path, content] of next) {
    fs.writeFile(`${ROOT}/${path}`, typeof content === 'string' ? encoder.encode(content) : content)
  }
  project = next
  return changes
}

const send = (message: string) => writeStdin(frameLspMessage(message))

const start = async (input: Extract<GoplsWorkerInput, { readonly _tag: 'Start' }>) => {
  for (const [path, bytes] of input.sources) fs.writeFile(`${GOROOT}/${path}`, bytes)
  for (const dir of ['/tmp', `${HOME}/.cache`, '/bin']) fs.mkdirAll(dir)
  syncProject(input.files)
  fs.chdir(ROOT)
  fs.onOutput((stream, bytes) => {
    if (stream === 'stdout') reader.push(bytes)
    else stderrTail = (stderrTail + decoder.decode(bytes)).slice(-STDERR_TAIL_BYTES)
  })

  const goCommand = makeGoCommand({
    goroot: GOROOT,
    root: ROOT,
    env: {},
    std: input.packages,
    files: () => project,
    readFile: (path) => {
      const bytes = fs.readFile(path)
      return bytes === undefined ? undefined : decoder.decode(bytes)
    },
  })
  const files = deferCallbacks(fs.api)
  const read = files.read
  Reflect.set(globalThis, 'goplsGoCommand', goCommand)
  Reflect.set(globalThis, 'fs', {
    ...files,
    read: (
      fd: number,
      buffer: Uint8Array,
      offset: number,
      length: number,
      position: number | null,
      callback: ReadCallback
    ) => {
      if (fd !== 0 && typeof read === 'function')
        return Reflect.apply(read, undefined, [fd, buffer, offset, length, position, callback]) as unknown
      pendingRead = { buffer, offset, length, callback }
      flushStdin()
      return undefined
    },
  })
  Reflect.set(globalThis, 'process', {
    getuid: () => -1,
    getgid: () => -1,
    geteuid: () => -1,
    getegid: () => -1,
    getgroups: () => [],
    pid: 1,
    ppid: 0,
    umask: () => 0o22,
    cwd: () => fs.cwd(),
    chdir: (path: string) => fs.chdir(path),
  })

  await import('../wasm-exec/wasm-exec.js')
  const go = new Go()
  let exitCode = 0
  go.argv = ['gopls', 'serve']
  go.env = {
    HOME,
    TMPDIR: '/tmp',
    PATH: '/bin',
    GOROOT,
    GOOS: 'js',
    GOARCH: 'wasm',
    GOTOOLCHAIN: 'local',
    GOMEMLIMIT: MEMORY_LIMIT,
  }
  go.exit = (code) => {
    exitCode = code
  }
  await go.run(await WebAssembly.instantiate(input.gopls, go.importObject))
  post({ _tag: 'Exited', reason: `gopls exited with code ${exitCode}\n${stderrTail}`.trim() })
}

globalThis.addEventListener('message', (event: MessageEvent<GoplsWorkerInput>) => {
  const input = event.data
  if (input._tag === 'Start') {
    start(input).catch((error: unknown) =>
      post({
        _tag: 'Exited',
        reason: `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n${stderrTail}`,
      })
    )
    return
  }
  if (input._tag === 'Send') {
    send(input.message)
    return
  }
  const changes = syncProject(input.files)
  if (changes.length > 0) {
    send(JSON.stringify({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes } }))
  }
})

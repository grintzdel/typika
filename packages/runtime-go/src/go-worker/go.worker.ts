import type { GoWorkerInput, GoWorkerOutput } from '../domain/worker-protocol.domain-model.ts'
import { makeGoProject, type GoProject } from '../go-project/go-project.ts'
import { decodeStdPack } from '../std-pack/std-pack.ts'

const post = globalThis.postMessage.bind(globalThis) as (message: GoWorkerOutput) => void

const describeError = (error: unknown) => (error instanceof Error ? (error.stack ?? error.message) : String(error))

let project: GoProject | undefined

const handle = async (message: GoWorkerInput) => {
  if (message._tag === 'Init') {
    project = makeGoProject({ compile: message.compile, link: message.link, std: decodeStdPack(message.std) })
    post({ _tag: 'Ready' })
    return
  }
  if (project === undefined) throw new Error('The Go worker is not initialized')
  project.sync(new Map(message.files))
  if (message._tag === 'Test') {
    await project.test(
      {
        runId: message.runId,
        ...(message.selected === undefined ? {} : { files: message.selected }),
        ...(message.namePattern === undefined ? {} : { namePattern: message.namePattern }),
      },
      (event) => post({ _tag: 'TestEvent', event })
    )
    return
  }
  const result = await project.run({
    entry: message.entry,
    args: message.args,
    onOutput: (stream, chunk) => post({ _tag: stream === 'stdout' ? 'Stdout' : 'Stderr', chunk }),
  })
  post(result._tag === 'Exited' ? { _tag: 'Exit', code: result.exitCode } : result)
}

globalThis.addEventListener('message', (event: MessageEvent<GoWorkerInput>) => {
  handle(event.data).catch((error: unknown) => post({ _tag: 'Crashed', message: describeError(error) }))
})

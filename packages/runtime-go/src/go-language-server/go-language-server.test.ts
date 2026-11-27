import { RuntimeAssetLoadError, type LanguageServerEvent } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'
import { describe, expect, it } from 'vitest'

import type { WorkerFiles } from '../domain/worker-protocol.domain-model.ts'
import { makeGoLanguageServer, type GoplsEvents, type GoplsSpawn } from './go-language-server.ts'

type FakeProcess = {
  readonly files: WorkerFiles
  readonly events: GoplsEvents
  readonly received: Array<string>
  readonly synced: Array<WorkerFiles>
  terminated: boolean
}

const makeFakeGopls = (failure?: unknown) => {
  const processes: Array<FakeProcess> = []
  const spawn: GoplsSpawn = (files, events) => {
    if (failure !== undefined) return Promise.reject(failure)
    const process: FakeProcess = { files, events, received: [], synced: [], terminated: false }
    processes.push(process)
    return Promise.resolve({
      send: (message) => process.received.push(message),
      sync: (next) => process.synced.push(next),
      terminate: () => {
        process.terminated = true
      },
    })
  }
  return { spawn, processes }
}

const ROOT_URI = 'file:///work'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const errorOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit) ? Option.getOrUndefined(Cause.findErrorOption(exit.cause)) : undefined

const collect = (stream: Stream.Stream<LanguageServerEvent, unknown>) => {
  const events: Array<LanguageServerEvent> = []
  const fiber = Effect.runFork(Stream.runForEach(stream, (event) => Effect.sync(() => events.push(event))))
  return { events, fiber }
}

describe('makeGoLanguageServer', () => {
  it('starts gopls on connect with the project files and relays its messages both ways', async () => {
    const gopls = makeFakeGopls()
    const files: WorkerFiles = [['main.go', 'package main']]
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => files })

    const { events, fiber } = collect(server.connect)
    await settle()
    await Effect.runPromise(server.send('{"id":1}'))
    gopls.processes[0]?.events.onMessage('{"id":1,"result":null}')
    await settle()

    expect(gopls.processes).toHaveLength(1)
    expect(gopls.processes[0]?.files).toEqual(files)
    expect(gopls.processes[0]?.received).toEqual(['{"id":1}'])
    expect(events).toEqual([{ _tag: 'Message', message: '{"id":1,"result":null}' }])
    await Effect.runPromise(Fiber.interrupt(fiber))
  })

  it('starts nothing before a client connects', () => {
    const gopls = makeFakeGopls()

    makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => [] })

    expect(gopls.processes).toHaveLength(0)
  })

  it('holds the messages sent before a client connects until gopls starts', async () => {
    const gopls = makeFakeGopls()
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => [] })

    await Effect.runPromise(server.send('{"id":1}'))
    const { fiber } = collect(server.connect)
    await settle()

    expect(gopls.processes[0]?.received).toEqual(['{"id":1}'])
    await Effect.runPromise(Fiber.interrupt(fiber))
  })

  it('passes the project files on to gopls when they change', async () => {
    const gopls = makeFakeGopls()
    let files: WorkerFiles = [['main.go', 'package main']]
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => files })
    const { fiber } = collect(server.connect)
    await settle()

    files = [['main.go', 'package main\n\nfunc main() {}']]
    server.filesChanged()
    await settle()

    expect(gopls.processes[0]?.synced).toEqual([files])
    await Effect.runPromise(Fiber.interrupt(fiber))
  })

  it('stops gopls when the client disconnects', async () => {
    const gopls = makeFakeGopls()
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => [] })
    const { fiber } = collect(server.connect)
    await settle()

    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(gopls.processes[0]?.terminated).toBe(true)
  })

  it('restarts gopls once after a crash and tells the client', async () => {
    const gopls = makeFakeGopls()
    let files: WorkerFiles = [['main.go', 'package main']]
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => files })
    const { events, fiber } = collect(server.connect)
    await settle()

    files = [['main.go', 'package main\n']]
    gopls.processes[0]?.events.onExit('fatal error: out of memory')
    await settle()
    await Effect.runPromise(server.send('{"id":2}'))

    expect(gopls.processes).toHaveLength(2)
    expect(gopls.processes[0]?.terminated).toBe(true)
    expect(gopls.processes[1]?.files).toEqual(files)
    expect(gopls.processes[1]?.received).toEqual(['{"id":2}'])
    expect(events).toEqual([{ _tag: 'Restarted' }])
    await Effect.runPromise(Fiber.interrupt(fiber))
  })

  it('reports itself unavailable after a second crash, for this client and the next ones', async () => {
    const gopls = makeFakeGopls()
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => [] })
    const { fiber } = collect(server.connect)
    await settle()

    gopls.processes[0]?.events.onExit('crash 1')
    await settle()
    gopls.processes[1]?.events.onExit('crash 2')

    expect(errorOf(await Effect.runPromiseExit(Fiber.join(fiber)))).toMatchObject({ _tag: 'RuntimeProcessError' })
    expect(gopls.processes[1]?.terminated).toBe(true)
    expect(errorOf(await Effect.runPromiseExit(Stream.runDrain(server.connect)))).toMatchObject({
      _tag: 'RuntimeProcessError',
    })
    expect(errorOf(await Effect.runPromiseExit(server.send('{}')))).toMatchObject({ _tag: 'RuntimeProcessError' })
    expect(gopls.processes).toHaveLength(2)
  })

  it('ends the previous connection when another client connects', async () => {
    const gopls = makeFakeGopls()
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: gopls.spawn, files: () => [] })
    const first = collect(server.connect)
    await settle()

    const second = collect(server.connect)
    await settle()

    expect(Exit.isSuccess(await Effect.runPromiseExit(Fiber.join(first.fiber)))).toBe(true)
    expect(gopls.processes[0]?.terminated).toBe(true)
    expect(gopls.processes[1]?.terminated).toBe(false)
    await Effect.runPromise(Fiber.interrupt(second.fiber))
  })

  it('fails the connection when gopls cannot be loaded', async () => {
    const failure = new RuntimeAssetLoadError({ asset: 'gopls.wasm.gzip', cause: 'offline' })
    const server = makeGoLanguageServer({ rootUri: ROOT_URI, spawn: makeFakeGopls(failure).spawn, files: () => [] })

    expect(errorOf(await Effect.runPromiseExit(Stream.runDrain(server.connect)))).toBe(failure)
  })
})

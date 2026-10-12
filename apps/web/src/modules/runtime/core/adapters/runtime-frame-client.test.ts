import { makeRuntimeRegistry, type ProcessOutput, type RuntimeLoaders, type RuntimeSession } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Scope from 'effect/Scope'
import * as Stream from 'effect/Stream'
import { afterEach, describe, expect, it } from 'vitest'

import { LOAD_PROGRESS, makeFakeRuntime, projectFixture, projectPath } from '../../__tests__/runtime.factory.ts'
import { serveRuntimeFrame } from '../frame-host/serve-runtime-frame.ts'
import { makeRuntimeFrameClient } from './runtime-frame-client.ts'

const channels: Array<MessageChannel> = []

afterEach(() => {
  for (const channel of channels.splice(0)) {
    channel.port1.close()
    channel.port2.close()
  }
})

const connect = (loaders?: RuntimeLoaders) => {
  const fake = makeFakeRuntime()
  const channel = new MessageChannel()
  channels.push(channel)
  const registry = makeRuntimeRegistry(loaders ?? { 'browser-js': () => Promise.resolve(fake.port) })
  Effect.runFork(Effect.scoped(serveRuntimeFrame(channel.port2, registry)))
  return { client: makeRuntimeFrameClient(channel.port1), port: channel.port1, journal: fake.journal }
}

const stdoutOf = (outputs: ReadonlyArray<ProcessOutput>) =>
  outputs.flatMap((output) => (output._tag === 'Stdout' ? [output.chunk] : [])).join('')

const withSession = <A, E>(use: (session: RuntimeSession) => Effect.Effect<A, E>, snapshot = projectFixture()) => {
  const { client, journal, port } = connect()
  return { run: Effect.runPromise(Effect.scoped(Effect.flatMap(client.boot(snapshot), use))), journal, port }
}

describe('runtime frame channel', () => {
  it('boots a session in the frame and runs the entry', async () => {
    const { run } = withSession((session) => Stream.runCollect(session.run({ command: 'src/main.ts', args: [] })))

    const outputs = await run

    expect(stdoutOf(outputs)).toBe('hello')
    expect(outputs.at(-1)).toEqual({ _tag: 'Exit', code: 0 })
  })

  it('relays file writes before the next run', async () => {
    const { run } = withSession((session) =>
      session.fs
        .writeFile(projectPath('src/main.ts'), 'edited')
        .pipe(Effect.andThen(Stream.runCollect(session.run({ command: 'src/main.ts', args: [] }))))
    )

    expect(stdoutOf(await run)).toBe('edited')
  })

  it('relays binary content', async () => {
    const { run } = withSession((session) =>
      session.fs
        .writeFile(projectPath('src/main.ts'), new TextEncoder().encode('bytes'))
        .pipe(Effect.andThen(Stream.runCollect(session.run({ command: 'src/main.ts', args: [] }))))
    )

    expect(stdoutOf(await run)).toBe('bytes')
  })

  it('streams test events', async () => {
    const { run } = withSession((session) => Stream.runCollect(session.test({})))

    const events = await run

    expect(events.map((event) => event._tag)).toEqual(['RunStarted', 'TestPassed', 'RunFinished'])
  })

  it('reports a compile error of a run with its diagnostics', async () => {
    const { run } = withSession((session) =>
      Effect.exit(Stream.runCollect(session.run({ command: 'broken', args: [] })))
    )

    const exit = await run

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      _tag: 'Fail',
      error: { _tag: 'RuntimeCompileError', diagnostics: [{ message: 'Unexpected end of file' }] },
    })
  })

  it('ends a run preempted in the frame as interrupted', async () => {
    const { run } = withSession((session) =>
      Effect.exit(Stream.runCollect(session.run({ command: 'preempted', args: [] })))
    )

    const exit = await run

    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
  })

  it('streams the asset download of a runtime', async () => {
    const { client } = connect()

    const progress = await Effect.runPromise(Stream.runCollect(client.load('browser-js')))

    expect(progress).toEqual(LOAD_PROGRESS)
  })

  it('fails to load a runtime the frame does not support', async () => {
    const { client } = connect()

    const exit = await Effect.runPromiseExit(Stream.runCollect(client.load('kotlin')))

    expect(Exit.isFailure(exit) && Cause.findErrorOption(exit.cause)).toMatchObject({
      value: { _tag: 'RuntimeUnsupportedError', kind: 'kotlin' },
    })
  })

  it('fails to boot a runtime the frame does not support', async () => {
    const { client } = connect({})

    const exit = await Effect.runPromiseExit(Effect.scoped(client.boot(projectFixture())))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      _tag: 'Fail',
      error: { _tag: 'RuntimeUnsupportedError', kind: 'browser-js' },
    })
  })

  it('stops the run in the frame when the consumer is interrupted', async () => {
    const { run, journal } = withSession((session) =>
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(Stream.runDrain(session.run({ command: 'hang', args: [] })))
        yield* Effect.sleep(20)
        yield* Fiber.interrupt(fiber)
        yield* Effect.sleep(20)
      })
    )

    await run

    expect(journal).toContain('run stopped')
  })

  it('closes the frame session with the scope', async () => {
    const { run, journal } = withSession(() => Effect.void)

    await run
    await Effect.runPromise(Effect.sleep(20))

    expect(journal).toEqual(['booted', 'closed'])
  })

  it('keeps a newer session running when an older one closes after it booted', async () => {
    const { client } = connect()

    const outputs = await Effect.runPromise(
      Effect.gen(function* () {
        const older = yield* Scope.make()
        yield* Scope.provide(older)(client.boot(projectFixture()))
        const newer = yield* Scope.make()
        const session = yield* Scope.provide(newer)(client.boot(projectFixture()))
        yield* Scope.close(older, Exit.void)
        return yield* Stream.runCollect(session.run({ command: 'src/main.ts', args: [] }))
      })
    )

    expect(stdoutOf(outputs)).toBe('hello')
  })

  it('ignores malformed messages', async () => {
    const { client, port } = connect()
    port.postMessage({ _tag: 'Run', id: 'not a number' })
    port.postMessage('garbage')

    const outputs = await Effect.runPromise(
      Effect.scoped(
        Effect.flatMap(client.boot(projectFixture()), (session) =>
          Stream.runCollect(session.run({ command: 'src/main.ts', args: [] }))
        )
      )
    )

    expect(stdoutOf(outputs)).toBe('hello')
  })
})

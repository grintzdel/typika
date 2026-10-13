import { providedKotlinCompilerUrl } from '@typika/kotlin-compiler/provided'
import {
  checkTestEventSequence,
  KotlinCompilerUnavailableError,
  RuntimeCompileError,
  RuntimeTimeoutError,
  type ProcessOutput,
  type RuntimeSession,
  type TestEvent,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'
import { describe, expect, it, vi } from 'vitest'

import { proxiedCompilerUrl } from '../../test/kotlin-compiler-proxy.plugin.ts'
import { exerciseStartFiles, projectPath, strategyKotlinProject } from '../__tests__/template.factory.ts'
import { makeKotlinRuntime, type KotlinRuntimeOptions } from './kotlin-runtime.ts'

const COMPILER_URL = proxiedCompilerUrl(providedKotlinCompilerUrl())
const EXPRESS_TEST = 'src/test/kotlin/checkout/ExpressShippingTest.kt'

const withSession = <A, E>(
  overrides: Parameters<typeof strategyKotlinProject>[0],
  use: (session: RuntimeSession) => Effect.Effect<A, E>,
  options: Partial<KotlinRuntimeOptions> = {}
) => {
  const runtime = makeKotlinRuntime({ compilerUrl: COMPILER_URL, ...options })
  return Effect.runPromise(Effect.scoped(Effect.flatMap(runtime.boot(strategyKotlinProject(overrides)), use)))
}

const collectTests = (session: RuntimeSession) => Stream.runCollect(session.test({}))

const stdoutOf = (outputs: ReadonlyArray<ProcessOutput>) =>
  outputs.flatMap((output) => (output._tag === 'Stdout' ? [output.chunk] : [])).join('')

const errorOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit) ? Option.getOrUndefined(Cause.findErrorOption(exit.cause)) : undefined

const finishedOf = (events: ReadonlyArray<TestEvent>) => events.find((event) => event._tag === 'RunFinished')

describe('kotlin runtime', () => {
  it('runs the tests of strategy-kotlin', async () => {
    const events = await withSession({}, collectTests)

    expect(checkTestEventSequence(events)).toEqual([])
    expect(finishedOf(events)).toMatchObject({ status: 'passed', passed: 11, failed: 0, skipped: 0 })
  })

  it('locates each failure of an exercise on the line of its test', async () => {
    const events = await withSession(exerciseStartFiles('implement-express'), collectTests)

    expect(finishedOf(events)).toMatchObject({ status: 'failed', failed: 4 })
    expect(events.find((event) => event._tag === 'TestFailed')).toMatchObject({
      file: EXPRESS_TEST,
      failure: {
        message: 'Expected <12.90 EUR>, actual <0.00 EUR>.',
        expected: '12.90 EUR',
        actual: '0.00 EUR',
        location: { file: EXPRESS_TEST, line: 13, column: 9 },
      },
    })
  })

  it('captures what a test prints with its test id', async () => {
    const printing = `package checkout

import kotlin.test.Test

class PrintingTest {
    @Test
    fun prints() {
        println("hello from a test")
    }
}
`
    const events = await withSession({ 'src/test/kotlin/checkout/PrintingTest.kt': printing }, (session) =>
      Stream.runCollect(session.test({ files: [projectPath('src/test/kotlin/checkout/PrintingTest.kt')] }))
    )

    const passed = events.find((event) => event._tag === 'TestPassed')
    expect(events.find((event) => event._tag === 'Output' && event.testId !== undefined)).toEqual({
      _tag: 'Output',
      runId: passed?.runId,
      testId: passed?.testId,
      stream: 'stdout',
      chunk: 'hello from a test\n',
    })
  })

  it('runs main and prints its output', async () => {
    const outputs = await withSession({}, (session) => Stream.runCollect(session.run({ command: '', args: [] })))

    expect(stdoutOf(outputs)).toContain('Ada (regular): 1.1 kg, subtotal 32.50 EUR\n')
    expect(outputs.at(-1)).toEqual({ _tag: 'Exit', code: 0 })
  })

  it('reports a compile error as diagnostics, for a run and for the tests', async () => {
    const broken = { 'src/main/kotlin/shop/Money.kt': 'package shop\n\nval broken: Int = "zero"\n' }

    const run = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.flatMap(
          makeKotlinRuntime({ compilerUrl: COMPILER_URL }).boot(strategyKotlinProject(broken)),
          (session) => Stream.runCollect(session.run({ command: '', args: [] }))
        )
      )
    )
    const events = await withSession(broken, collectTests)

    expect(errorOf(run)).toBeInstanceOf(RuntimeCompileError)
    expect(events.map((event) => event._tag)).toEqual(['RunStarted', 'Diagnostics', 'RunFinished'])
    expect(finishedOf(events)).toMatchObject({ status: 'errored' })
  })

  it('compiles the same sources once', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>((input, init) => globalThis.fetch(input, init))

    await withSession({}, (session) => Effect.andThen(collectTests(session), collectTests(session)), { fetch })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('stops a test that never ends at the watchdog, then runs the next one', async () => {
    const endless = `package checkout

import kotlin.test.Test

class EndlessTest {
    @Test
    fun spins() {
        while (true) {}
    }
}
`
    const exit = await withSession(
      { 'src/test/kotlin/checkout/EndlessTest.kt': endless },
      (session) =>
        Effect.gen(function* () {
          const stuck = yield* Effect.exit(Stream.runCollect(session.test({})))
          const next = yield* Stream.runCollect(session.run({ command: '', args: [] }))
          return { stuck, next }
        }),
      { limits: { testTimeoutMs: 5_000 } }
    )

    expect(errorOf(exit.stuck)).toEqual(new RuntimeTimeoutError({ limitMs: 5_000 }))
    expect(exit.next.at(-1)).toEqual({ _tag: 'Exit', code: 0 })
  })

  it('reports a compiler it cannot reach as unavailable', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.flatMap(
          makeKotlinRuntime({ compilerUrl: 'http://127.0.0.1:9' }).boot(strategyKotlinProject()),
          (session) => Stream.runCollect(session.test({}))
        )
      )
    )

    expect(errorOf(exit)).toBeInstanceOf(KotlinCompilerUnavailableError)
  })
})

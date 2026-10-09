import {
  checkTestEventSequence,
  RuntimeCompileError,
  RuntimeTimeoutError,
  type ProcessOutput,
  type RuntimeSession,
  type TestEvent,
} from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import * as Option from 'effect/Option'
import * as Stream from 'effect/Stream'
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url'
import { describe, expect, it } from 'vitest'

import { projectFixture, projectPath } from '../__tests__/project.factory.ts'
import { strategyBaseProject } from '../__tests__/template.factory.ts'
import { makeBrowserJsRuntime } from './browser-js-runtime.ts'

const runtime = makeBrowserJsRuntime({ esbuildWasmUrl: wasmUrl, limits: { runTimeoutMs: 3_000, testTimeoutMs: 3_000 } })

const withSession = <A, E>(
  files: Parameters<typeof projectFixture>[0],
  use: (session: RuntimeSession) => Effect.Effect<A, E>
) => Effect.runPromise(Effect.scoped(Effect.flatMap(runtime.boot(projectFixture(files)), use)))

const collectTests = (session: RuntimeSession, options = {}) => Stream.runCollect(session.test(options))
const collectRun = (session: RuntimeSession, entry = 'src/main.ts') =>
  Stream.runCollect(session.run({ command: entry, args: [] }))

const outputOf = (events: ReadonlyArray<ProcessOutput>) =>
  events.flatMap((event) => (event._tag === 'Stdout' ? [event.chunk] : [])).join('')

const finishedOf = (events: ReadonlyArray<TestEvent>) => events.find((event) => event._tag === 'RunFinished')

describe('browser-js runtime', () => {
  it('reports the asset download while loading', async () => {
    const progress = await Effect.runPromise(Stream.runCollect(makeBrowserJsRuntime({ esbuildWasmUrl: wasmUrl }).load))
    expect(progress.at(-1)).toMatchObject({ asset: wasmUrl })
    expect(progress.at(-1)?.loadedBytes).toBeGreaterThan(1_000_000)
  })

  it('runs the tests of the Strategy template green', async () => {
    const events = await Effect.runPromise(
      Effect.scoped(Effect.flatMap(runtime.boot(strategyBaseProject()), (session) => collectTests(session)))
    )
    expect(checkTestEventSequence(events)).toEqual([])
    expect(finishedOf(events)).toMatchObject({ status: 'passed', failed: 0 })
    expect(finishedOf(events)?._tag === 'RunFinished' && finishedOf(events)?.passed).toBeGreaterThan(5)
  })

  it('runs the entry of the Strategy template', async () => {
    const output = await Effect.runPromise(
      Effect.scoped(Effect.flatMap(runtime.boot(strategyBaseProject()), (session) => collectRun(session)))
    )
    expect(outputOf(output)).toContain('Ada (regular)')
    expect(output.at(-1)).toEqual({ _tag: 'Exit', code: 0 })
  })

  it('reports a failing assertion with the Vitest message', async () => {
    const events = await withSession(
      { 'tests/a.test.ts': `import { expect, it } from 'vitest'\nit('fails', () => { expect(1).toBe(2) })\n` },
      collectTests
    )
    const failed = events.find((event) => event._tag === 'TestFailed')
    expect(failed?._tag === 'TestFailed' && failed.failure.message).toBe('expected 1 to be 2 // Object.is equality')
    expect(finishedOf(events)).toMatchObject({ status: 'failed', failed: 1 })
  })

  it('reports a syntax error as diagnostics of an errored run', async () => {
    const events = await withSession(
      { 'tests/a.test.ts': `import { it } from 'vitest'\n\nit('broken', () => {\n` },
      collectTests
    )
    expect(checkTestEventSequence(events)).toEqual([])
    const diagnostics = events.find((event) => event._tag === 'Diagnostics')
    expect(diagnostics?._tag === 'Diagnostics' && diagnostics.diagnostics[0]?.location).toMatchObject({
      file: 'tests/a.test.ts',
      line: 4,
    })
    expect(finishedOf(events)).toMatchObject({ status: 'errored' })
  })

  it('reports a package missing from package.json', async () => {
    const events = await withSession(
      { 'tests/a.test.ts': `import { it } from 'vitest'\nimport _ from 'lodash'\nit('x', () => { _.noop() })\n` },
      collectTests
    )
    const diagnostics = events.find((event) => event._tag === 'Diagnostics')
    expect(diagnostics?._tag === 'Diagnostics' && diagnostics.diagnostics[0]?.message).toContain(
      'Cannot find package "lodash"'
    )
  })

  it('follows the tsconfig of the project when it keeps unused imports', async () => {
    const events = await withSession(
      {
        'tsconfig.json': '{ "compilerOptions": { "verbatimModuleSyntax": true } }',
        'tests/a.test.ts': `import { it } from 'vitest'\nimport _ from 'lodash'\nit('x', () => {})\n`,
      },
      collectTests
    )
    expect(finishedOf(events)).toMatchObject({ status: 'errored' })
  })

  it('isolates the modules of each test file', async () => {
    const counterTest = `import { expect, it } from 'vitest'\nimport { next } from '../src/counter.ts'\nit('starts at 1', () => { expect(next()).toBe(1) })\n`
    const events = await withSession(
      {
        'src/counter.ts': 'let count = 0\nexport const next = () => ++count\n',
        'tests/a.test.ts': counterTest,
        'tests/b.test.ts': counterTest,
      },
      collectTests
    )
    expect(finishedOf(events)).toMatchObject({ status: 'passed', passed: 2 })
  })

  it('attaches console output to the running test and filters by name', async () => {
    const events = await withSession(
      {
        'tests/a.test.ts': `import { it } from 'vitest'\nit('logs', () => { console.log('hello', 42) })\nit('other', () => {})\n`,
      },
      (session) => collectTests(session, { namePattern: 'logs' })
    )
    const passed = events.find((event) => event._tag === 'TestPassed')
    expect(events).toContainEqual(
      expect.objectContaining({
        _tag: 'Output',
        stream: 'stdout',
        chunk: 'hello 42\n',
        testId: passed?._tag === 'TestPassed' ? passed.testId : '',
      })
    )
    expect(events).toContainEqual(expect.objectContaining({ _tag: 'TestSkipped', name: 'other', reason: 'filtered' }))
  })

  it('sees the files written after boot', async () => {
    const events = await withSession(
      { 'tests/a.test.ts': `import { it } from 'vitest'\nit('ok', () => {})\n` },
      (session) =>
        Effect.andThen(
          session.fs.writeFile(
            projectPath('tests/a.test.ts'),
            `import { expect, it } from 'vitest'\nit('ok', () => { expect(true).toBe(false) })\n`
          ),
          collectTests(session)
        )
    )
    expect(finishedOf(events)).toMatchObject({ status: 'failed' })
  })

  it('fails a run that does not compile', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.flatMap(runtime.boot(projectFixture({ 'src/main.ts': 'const = 1\n' })), (session) => collectRun(session))
      )
    )
    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(RuntimeCompileError)
  })

  it('waits for pending timers before exiting', async () => {
    const output = await withSession(
      { 'src/main.ts': `console.log('first')\nsetTimeout(() => console.error('later'), 50)\n` },
      (session) => collectRun(session)
    )
    expect(output).toEqual([
      { _tag: 'Stdout', chunk: 'first\n' },
      { _tag: 'Stderr', chunk: 'later\n' },
      { _tag: 'Exit', code: 0 },
    ])
  })

  it('exits with code 1 on an uncaught error', async () => {
    const output = await withSession({ 'src/main.ts': `throw new Error('boom')\n` }, (session) => collectRun(session))
    expect(output.some((event) => event._tag === 'Stderr' && event.chunk.includes('boom'))).toBe(true)
    expect(output.at(-1)).toEqual({ _tag: 'Exit', code: 1 })
  })

  it('kills an infinite loop when the watchdog fires', async () => {
    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.flatMap(
          runtime.boot(
            projectFixture({ 'tests/a.test.ts': `import { it } from 'vitest'\nit('spins', () => { for (;;) {} })\n` })
          ),
          (session) => collectTests(session)
        )
      )
    )
    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(RuntimeTimeoutError)
  })

  it('interrupts the running execution when another one starts', async () => {
    const result = await withSession(
      {
        'src/main.ts': 'setInterval(() => {}, 1000)\n',
        'tests/a.test.ts': `import { it } from 'vitest'\nit('ok', () => {})\n`,
      },
      (session) =>
        Effect.gen(function* () {
          const running = yield* Effect.forkChild(collectRun(session))
          yield* Effect.sleep(300)
          const events = yield* collectTests(session)
          const runExit = yield* Fiber.await(running)
          return { events, runExit }
        })
    )
    expect(finishedOf(result.events)).toMatchObject({ status: 'passed' })
    expect(Exit.isFailure(result.runExit) && Cause.hasInterrupts(result.runExit.cause)).toBe(true)
  })

  it('has no preview', async () => {
    const preview = await withSession({}, (session) => session.preview)
    expect(Option.isNone(preview)).toBe(true)
  })
})

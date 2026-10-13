import { RuntimeCompileError, type ProcessOutput, type TestEvent } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import { describe, expect, it, vi } from 'vitest'

import type { KotlinCompilation } from '../domain/compile-protocol.domain-model.ts'
import type { KotlinExecutor } from '../domain/kotlin-executor.port.ts'
import type { KotlinProgramJob, KotlinTestJob } from '../domain/kotlin-job.domain-model.ts'
import type { KotlinCompilerClient } from '../kotlin-compiler-client/kotlin-compiler-client.ts'
import { makeKotlinProject } from './kotlin-project.ts'

const FILES = new Map([
  ['typika.toml', 'schema = 1'],
  ['src/main/kotlin/Main.kt', 'fun main() {}'],
  ['src/test/kotlin/shop/MoneyTest.kt', 'package shop\n\nclass MoneyTest'],
])
const ARTIFACT = { kind: 'js', code: 'main()', sourceMap: '{}' } as const
const WARNING = {
  severity: 'warning',
  message: 'unused',
  location: { file: 'src/main/kotlin/Main.kt', line: 1 },
} as const

const compilerReturning = (compilation: KotlinCompilation) => {
  const compile = vi.fn<KotlinCompilerClient['compile']>(() => Effect.succeed(compilation))
  return { compile, compiler: { compile } }
}

const recordingExecutor = () => {
  const jobs: Array<KotlinTestJob | KotlinProgramJob> = []
  const executor: KotlinExecutor = {
    tests: (job) => Effect.sync(() => void jobs.push(job)),
    program: (job) => Effect.sync(() => void jobs.push(job)),
  }
  return { jobs, executor }
}

const errorOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit) ? Option.getOrUndefined(Cause.findErrorOption(exit.cause)) : undefined

describe('makeKotlinProject', () => {
  it('compiles the sources and the tests, then runs the test classes with the warnings', async () => {
    const { compile, compiler } = compilerReturning({ _tag: 'Compiled', artifact: ARTIFACT, diagnostics: [WARNING] })
    const { jobs, executor } = recordingExecutor()

    await Effect.runPromise(
      Effect.scoped(makeKotlinProject(compiler, executor).test(FILES, { runId: 'r', namePattern: 'adds' }, () => {}))
    )

    expect(compile.mock.calls[0]?.[1].map((file) => file.path)).toEqual([
      'src/main/kotlin/Main.kt',
      'src/test/kotlin/shop/MoneyTest.kt',
    ])
    expect(jobs).toEqual([
      {
        runId: 'r',
        artifact: ARTIFACT,
        projectFiles: ['src/main/kotlin/Main.kt', 'src/test/kotlin/shop/MoneyTest.kt'],
        classes: [['shop.MoneyTest', 'src/test/kotlin/shop/MoneyTest.kt']],
        warnings: [WARNING],
        namePattern: 'adds',
      },
    ])
  })

  it('reports a failed compilation of the tests as an errored run with its diagnostics', async () => {
    const error = { severity: 'error', message: 'type mismatch' } as const
    const { compiler } = compilerReturning({ _tag: 'Failed', diagnostics: [error] })
    const { jobs, executor } = recordingExecutor()
    const events: Array<TestEvent> = []

    await Effect.runPromise(
      Effect.scoped(makeKotlinProject(compiler, executor).test(FILES, { runId: 'r' }, (event) => events.push(event)))
    )

    expect(jobs).toEqual([])
    expect(events.map((event) => event._tag)).toEqual(['RunStarted', 'Diagnostics', 'RunFinished'])
    expect(events[1]).toEqual({ _tag: 'Diagnostics', runId: 'r', diagnostics: [error] })
    expect(events[2]).toMatchObject({ status: 'errored' })
  })

  it('runs main from the sources without the tests', async () => {
    const { compile, compiler } = compilerReturning({ _tag: 'Compiled', artifact: ARTIFACT, diagnostics: [] })
    const { jobs, executor } = recordingExecutor()

    await Effect.runPromise(Effect.scoped(makeKotlinProject(compiler, executor).run(FILES, {}, () => {})))

    expect(compile.mock.calls[0]?.[0]).toBe('run')
    expect(jobs).toEqual([{ artifact: ARTIFACT, projectFiles: ['src/main/kotlin/Main.kt'] }])
  })

  it('fails a run that does not compile with its diagnostics', async () => {
    const error = { severity: 'error', message: 'type mismatch' } as const
    const { compiler } = compilerReturning({ _tag: 'Failed', diagnostics: [error] })
    const outputs: Array<ProcessOutput> = []

    const exit = await Effect.runPromiseExit(
      Effect.scoped(
        makeKotlinProject(compiler, recordingExecutor().executor).run(FILES, {}, (output) => outputs.push(output))
      )
    )

    expect(errorOf(exit)).toEqual(new RuntimeCompileError({ diagnostics: [error] }))
    expect(outputs).toEqual([])
  })
})

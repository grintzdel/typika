import {
  KotlinCompilerRateLimitedError,
  KotlinCompilerUnavailableError,
  RuntimeCompileError,
  RuntimeProcessError,
  RuntimeTimeoutError,
} from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import { EMPTY_CONSOLE, reduceConsole, type ConsoleEvent, type ConsoleState } from './console.domain-model.ts'

const play = (events: ReadonlyArray<ConsoleEvent>, limit?: number) =>
  events.reduce<ConsoleState>((state, event) => reduceConsole(state, event, limit), EMPTY_CONSOLE)

const stdout = (chunk: string): ConsoleEvent => ({ _tag: 'Output', output: { _tag: 'Stdout', chunk } })
const stderr = (chunk: string): ConsoleEvent => ({ _tag: 'Output', output: { _tag: 'Stderr', chunk } })

describe('reduceConsole', () => {
  it('starts running with no output', () => {
    expect(EMPTY_CONSOLE).toEqual({
      entries: [],
      diagnostics: [],
      size: 0,
      truncated: false,
      outcome: { _tag: 'Running' },
    })
  })

  it('keeps stdout and stderr in order', () => {
    const state = play([stdout('a'), stderr('b'), stdout('c')])

    expect(state.entries).toEqual([
      { stream: 'stdout', text: 'a' },
      { stream: 'stderr', text: 'b' },
      { stream: 'stdout', text: 'c' },
    ])
  })

  it('records the exit code', () => {
    expect(play([stdout('a'), { _tag: 'Output', output: { _tag: 'Exit', code: 1 } }]).outcome).toEqual({
      _tag: 'Exited',
      code: 1,
    })
  })

  it('lists compile diagnostics with their location', () => {
    const error = new RuntimeCompileError({
      diagnostics: [
        { severity: 'error', message: 'Expected ";"', location: { file: 'src/main.ts', line: 3, column: 7 } },
        { severity: 'warning', message: 'Unused import' },
      ],
    })

    const state = play([{ _tag: 'Failed', error }])

    expect(state.outcome).toEqual({ _tag: 'CompileFailed' })
    expect(state.entries).toEqual([
      { stream: 'diagnostic', text: 'src/main.ts:3:7 Expected ";"' },
      { stream: 'diagnostic', text: 'Unused import' },
    ])
    expect(state.diagnostics).toEqual(error.diagnostics)
  })

  it('records an interruption', () => {
    expect(play([stdout('a'), { _tag: 'Interrupted' }]).outcome).toEqual({ _tag: 'Interrupted' })
  })

  it('records a timeout', () => {
    expect(play([{ _tag: 'Failed', error: new RuntimeTimeoutError({ limitMs: 30_000 }) }]).outcome).toEqual({
      _tag: 'TimedOut',
      limitMs: 30_000,
    })
  })

  it('records a crash with its cause', () => {
    const state = play([{ _tag: 'Failed', error: new RuntimeProcessError({ cause: 'Out of memory' }) }])

    expect(state.outcome).toEqual({ _tag: 'Crashed', message: 'Out of memory' })
  })

  it.each([
    [new KotlinCompilerRateLimitedError({ retryAfterSeconds: 12 }), { _tag: 'CompilerBusy', retryAfterSeconds: 12 }],
    [new KotlinCompilerUnavailableError({ cause: 'HTTP 503' }), { _tag: 'CompilerUnavailable' }],
  ])('records a Kotlin compiler that cannot compile now', (error, outcome) => {
    expect(play([{ _tag: 'Failed', error }]).outcome).toEqual(outcome)
  })

  it('drops the oldest output beyond the limit', () => {
    const state = play([stdout('aaaa'), stdout('bbbb'), stdout('cccc')], 8)

    expect(state.entries.map((entry) => entry.text)).toEqual(['bbbb', 'cccc'])
    expect(state.size).toBe(8)
    expect(state.truncated).toBe(true)
  })
})

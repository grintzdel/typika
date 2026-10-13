import {
  KotlinCompilerRateLimitedError,
  KotlinCompilerUnavailableError,
  RuntimeTimeoutError,
  type TestEvent,
} from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import { EMPTY_TEST_RUN, reduceTestRun, type TestRunEvent, type TestRunState } from './test-run.domain-model.ts'

const play = (events: ReadonlyArray<TestEvent | TestRunEvent>) =>
  events.reduce<TestRunState>(
    (state, event) => reduceTestRun(state, 'runId' in event ? { _tag: 'Event', event } : event),
    EMPTY_TEST_RUN
  )

const base = { runId: 'r1' }
const started: TestEvent = { _tag: 'RunStarted', ...base, startedAt: 0 }
const suite: TestEvent = { _tag: 'SuiteStarted', ...base, suiteId: 's1', name: 'pricing', file: 'tests/a.test.ts' }
const nested: TestEvent = {
  _tag: 'SuiteStarted',
  ...base,
  suiteId: 's2',
  parentId: 's1',
  name: 'shipping',
  file: 'tests/a.test.ts',
}
const passed: TestEvent = {
  _tag: 'TestPassed',
  ...base,
  testId: 't1',
  suiteId: 's2',
  name: 'is free',
  file: 'tests/a.test.ts',
  durationMs: 2,
}
const failed: TestEvent = {
  _tag: 'TestFailed',
  ...base,
  testId: 't2',
  suiteId: 's1',
  name: 'adds tax',
  file: 'tests/a.test.ts',
  durationMs: 3,
  failure: { message: 'expected 12 to be 15', location: { file: 'tests/a.test.ts', line: 22 } },
}
const skipped: TestEvent = { _tag: 'TestSkipped', ...base, testId: 't3', name: 'later', file: 'tests/b.test.ts' }

describe('reduceTestRun', () => {
  it('starts running with no results', () => {
    expect(EMPTY_TEST_RUN).toEqual({
      outcome: { _tag: 'Running' },
      tests: [],
      diagnostics: [],
      counts: { passed: 0, failed: 0, skipped: 0 },
      suites: {},
    })
  })

  it('lists each test with its suite path and status', () => {
    const state = play([started, suite, nested, passed, failed, skipped])

    expect(state.tests).toEqual([
      {
        testId: 't1',
        name: 'is free',
        file: 'tests/a.test.ts',
        suitePath: ['pricing', 'shipping'],
        status: 'passed',
        durationMs: 2,
      },
      {
        testId: 't2',
        name: 'adds tax',
        file: 'tests/a.test.ts',
        suitePath: ['pricing'],
        status: 'failed',
        durationMs: 3,
        failure: failed._tag === 'TestFailed' ? failed.failure : undefined,
      },
      { testId: 't3', name: 'later', file: 'tests/b.test.ts', suitePath: [], status: 'skipped' },
    ])
  })

  it('counts results as they arrive', () => {
    expect(play([started, suite, nested, passed, failed]).counts).toEqual({ passed: 1, failed: 1, skipped: 0 })
  })

  it('finishes with the status of the run', () => {
    const finished: TestEvent = {
      _tag: 'RunFinished',
      ...base,
      status: 'failed',
      passed: 1,
      failed: 1,
      skipped: 0,
      durationMs: 9,
    }

    expect(play([started, suite, passed, failed, finished]).outcome).toEqual({
      _tag: 'Finished',
      status: 'failed',
      durationMs: 9,
    })
  })

  it('keeps the diagnostics of an errored run', () => {
    const state = play([
      started,
      { _tag: 'Diagnostics', ...base, diagnostics: [{ severity: 'error', message: 'Unexpected token' }] },
    ])

    expect(state.diagnostics).toEqual([{ severity: 'error', message: 'Unexpected token' }])
  })

  it('records an interrupted run', () => {
    expect(play([started, passed, { _tag: 'Interrupted' }]).outcome).toEqual({ _tag: 'Interrupted' })
  })

  it.each([
    [new KotlinCompilerRateLimitedError({ retryAfterSeconds: 12 }), { _tag: 'CompilerBusy', retryAfterSeconds: 12 }],
    [new KotlinCompilerUnavailableError({ cause: 'HTTP 503' }), { _tag: 'CompilerUnavailable' }],
  ])('records a Kotlin compiler that cannot compile now', (error, outcome) => {
    expect(play([{ _tag: 'Failed', error }]).outcome).toEqual(outcome)
  })

  it('records a run stopped by the watchdog', () => {
    const state = play([started, passed, { _tag: 'Failed', error: new RuntimeTimeoutError({ limitMs: 30_000 }) }])

    expect(state.outcome).toEqual({ _tag: 'TimedOut', limitMs: 30_000 })
    expect(state.counts.passed).toBe(1)
  })
})

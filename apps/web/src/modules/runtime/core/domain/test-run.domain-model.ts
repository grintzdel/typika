import type { Diagnostic, RunStatus, RuntimeExecutionError, TestEvent, TestFailure } from '@typika/runtime-core'

import { describeCause } from './runtime-error-data.ts'

export type TestResult = {
  readonly testId: string
  readonly name: string
  readonly file: string
  readonly suitePath: ReadonlyArray<string>
  readonly status: 'passed' | 'failed' | 'skipped'
  readonly durationMs?: number
  readonly failure?: TestFailure
}

export type TestRunOutcome =
  | { readonly _tag: 'Running' }
  | { readonly _tag: 'Finished'; readonly status: RunStatus; readonly durationMs: number }
  | { readonly _tag: 'TimedOut'; readonly limitMs: number }
  | { readonly _tag: 'Crashed'; readonly message: string }
  | { readonly _tag: 'CompilerBusy'; readonly retryAfterSeconds: number }
  | { readonly _tag: 'CompilerUnavailable' }
  | { readonly _tag: 'Interrupted' }

export type TestRunState = {
  readonly outcome: TestRunOutcome
  readonly tests: ReadonlyArray<TestResult>
  readonly diagnostics: ReadonlyArray<Diagnostic>
  readonly counts: { readonly passed: number; readonly failed: number; readonly skipped: number }
  readonly suites: Readonly<Record<string, { readonly name: string; readonly parentId?: string }>>
}

export type TestRunEvent =
  | { readonly _tag: 'Event'; readonly event: TestEvent }
  | { readonly _tag: 'Failed'; readonly error: RuntimeExecutionError }
  | { readonly _tag: 'Interrupted' }

export const EMPTY_TEST_RUN: TestRunState = {
  outcome: { _tag: 'Running' },
  tests: [],
  diagnostics: [],
  counts: { passed: 0, failed: 0, skipped: 0 },
  suites: {},
}

const suitePathOf = (state: TestRunState, suiteId: string | undefined): ReadonlyArray<string> => {
  const path: Array<string> = []
  let current = suiteId === undefined ? undefined : state.suites[suiteId]
  while (current !== undefined) {
    path.unshift(current.name)
    current = current.parentId === undefined ? undefined : state.suites[current.parentId]
  }
  return path
}

const record = (state: TestRunState, result: TestResult): TestRunState => ({
  ...state,
  tests: [...state.tests, result],
  counts: { ...state.counts, [result.status]: state.counts[result.status] + 1 },
})

const outcomeOf = (error: RuntimeExecutionError): TestRunOutcome => {
  switch (error._tag) {
    case 'RuntimeTimeoutError':
      return { _tag: 'TimedOut', limitMs: error.limitMs }
    case 'RuntimeProcessError':
      return { _tag: 'Crashed', message: describeCause(error.cause) }
    case 'KotlinCompilerRateLimitedError':
      return { _tag: 'CompilerBusy', retryAfterSeconds: error.retryAfterSeconds }
    case 'KotlinCompilerUnavailableError':
      return { _tag: 'CompilerUnavailable' }
    default:
      return { _tag: 'Crashed', message: error._tag }
  }
}

export const reduceTestRun = (state: TestRunState, input: TestRunEvent): TestRunState => {
  if (input._tag === 'Interrupted') return { ...state, outcome: { _tag: 'Interrupted' } }
  if (input._tag === 'Failed') return { ...state, outcome: outcomeOf(input.error) }
  const event = input.event
  switch (event._tag) {
    case 'RunStarted':
      return EMPTY_TEST_RUN
    case 'SuiteStarted':
      return {
        ...state,
        suites: {
          ...state.suites,
          [event.suiteId]: { name: event.name, ...(event.parentId === undefined ? {} : { parentId: event.parentId }) },
        },
      }
    case 'TestPassed':
      return record(state, {
        testId: event.testId,
        name: event.name,
        file: event.file,
        suitePath: suitePathOf(state, event.suiteId),
        status: 'passed',
        durationMs: event.durationMs,
      })
    case 'TestFailed':
      return record(state, {
        testId: event.testId,
        name: event.name,
        file: event.file,
        suitePath: suitePathOf(state, event.suiteId),
        status: 'failed',
        durationMs: event.durationMs,
        failure: event.failure,
      })
    case 'TestSkipped':
      return record(state, {
        testId: event.testId,
        name: event.name,
        file: event.file,
        suitePath: suitePathOf(state, event.suiteId),
        status: 'skipped',
      })
    case 'Diagnostics':
      return { ...state, diagnostics: [...state.diagnostics, ...event.diagnostics] }
    case 'RunFinished':
      return { ...state, outcome: { _tag: 'Finished', status: event.status, durationMs: event.durationMs } }
    default:
      return state
  }
}

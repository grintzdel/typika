import { checkTestEventSequence, makeSuiteId, makeTestId, type TestEvent } from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import type { Test2JsonEvent } from '../convert-test2json/convert-test2json.ts'
import { makeTest2JsonMapper } from './map-test2json-events.ts'

const FILE = 'internal/checkout/quote_test.go'

const map = (events: ReadonlyArray<Test2JsonEvent>) => {
  const emitted: Array<TestEvent> = []
  const tally = { passed: 0, failed: 0, skipped: 0 }
  const mapper = makeTest2JsonMapper({
    runId: 'run',
    dir: 'internal/checkout',
    fileOf: () => FILE,
    emit: (event) => emitted.push(event),
    tally,
  })
  for (const event of events) mapper.handle(event)
  mapper.close()
  return { emitted, tally }
}

const wrapped = (
  emitted: ReadonlyArray<TestEvent>,
  passed: number,
  failed: number,
  skipped: number
): Array<TestEvent> => [
  { _tag: 'RunStarted', runId: 'run', startedAt: 0 },
  ...emitted,
  {
    _tag: 'RunFinished',
    runId: 'run',
    status: failed > 0 ? 'failed' : 'passed',
    passed,
    failed,
    skipped,
    durationMs: 0,
  },
]

describe('makeTest2JsonMapper', () => {
  it('turns a test with subtests into a suite, and its subtests into tests', () => {
    const { emitted, tally } = map([
      { Action: 'run', Test: 'TestQuote' },
      { Action: 'run', Test: 'TestQuote/adds_shipping' },
      { Action: 'output', Test: 'TestQuote/adds_shipping', Output: '    quote_test.go:12: got 4.90\n' },
      { Action: 'output', Test: 'TestQuote/adds_shipping', Output: '        want 5.90\n' },
      { Action: 'output', Test: 'TestQuote/adds_shipping', Output: '    --- FAIL: TestQuote/adds_shipping (0.02s)\n' },
      { Action: 'fail', Test: 'TestQuote/adds_shipping', Elapsed: 0.02 },
      { Action: 'run', Test: 'TestQuote/is_free' },
      { Action: 'skip', Test: 'TestQuote/is_free', Elapsed: 0 },
      { Action: 'fail', Test: 'TestQuote', Elapsed: 0.02 },
      { Action: 'run', Test: 'TestTotal' },
      { Action: 'pass', Test: 'TestTotal', Elapsed: 0.001 },
    ])

    const suiteId = makeSuiteId(FILE, ['TestQuote'])
    expect(emitted.filter((event) => event._tag !== 'Output')).toEqual([
      { _tag: 'SuiteStarted', runId: 'run', suiteId, name: 'TestQuote', file: FILE },
      {
        _tag: 'TestFailed',
        runId: 'run',
        testId: makeTestId(FILE, ['TestQuote'], 'adds_shipping'),
        suiteId,
        name: 'adds_shipping',
        file: FILE,
        durationMs: 20,
        failure: {
          message: 'quote_test.go:12: got 4.90\nwant 5.90',
          location: { file: 'internal/checkout/quote_test.go', line: 12 },
        },
      },
      {
        _tag: 'TestSkipped',
        runId: 'run',
        testId: makeTestId(FILE, ['TestQuote'], 'is_free'),
        suiteId,
        name: 'is_free',
        file: FILE,
        reason: 'skip',
      },
      { _tag: 'SuiteFinished', runId: 'run', suiteId },
      {
        _tag: 'TestPassed',
        runId: 'run',
        testId: makeTestId(FILE, [], 'TestTotal'),
        name: 'TestTotal',
        file: FILE,
        durationMs: 1,
      },
    ])
    expect(tally).toEqual({ passed: 1, failed: 1, skipped: 1 })
    expect(checkTestEventSequence(wrapped(emitted, 1, 1, 1))).toEqual([])
  })

  it('attaches output to the test it belongs to', () => {
    const { emitted } = map([
      { Action: 'run', Test: 'TestTotal' },
      { Action: 'output', Test: 'TestTotal', Output: 'hello\n' },
      { Action: 'output', Output: 'PASS\n' },
      { Action: 'pass', Test: 'TestTotal' },
    ])

    expect(emitted.filter((event) => event._tag === 'Output')).toEqual([
      { _tag: 'Output', runId: 'run', testId: makeTestId(FILE, [], 'TestTotal'), stream: 'stdout', chunk: 'hello\n' },
      { _tag: 'Output', runId: 'run', stream: 'stdout', chunk: 'PASS\n' },
    ])
  })

  it('fails the tests still running and closes their suites when the binary stops', () => {
    const { emitted, tally } = map([
      { Action: 'run', Test: 'TestQuote' },
      { Action: 'run', Test: 'TestQuote/loops' },
      { Action: 'output', Test: 'TestQuote/loops', Output: 'panic: boom\n' },
    ])

    expect(emitted.map((event) => event._tag)).toEqual(['SuiteStarted', 'Output', 'TestFailed', 'SuiteFinished'])
    expect(emitted.find((event) => event._tag === 'TestFailed')).toMatchObject({ failure: { message: 'panic: boom' } })
    expect(tally.failed).toBe(1)
  })
})

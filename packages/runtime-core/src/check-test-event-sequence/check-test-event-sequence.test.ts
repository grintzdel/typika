import { describe, expect, it } from 'vitest'

import {
  diagnostics,
  runFinished,
  runStarted,
  suiteFinished,
  suiteStarted,
  testFailed,
  testPassed,
  testSkipped,
} from '../__tests__/test-event.factory.ts'
import { checkTestEventSequence } from './check-test-event-sequence.ts'

const violation = (text: string): ReadonlyArray<unknown> => [expect.stringContaining(text)]

describe('checkTestEventSequence', () => {
  it('accepts a run with nested suites', () => {
    const events = [
      runStarted(),
      suiteStarted('s1'),
      suiteStarted('s2', { parentId: 's1' }),
      testPassed('t1', { suiteId: 's2' }),
      testFailed('t2', { suiteId: 's2' }),
      suiteFinished('s2'),
      testSkipped('t3', { suiteId: 's1', reason: 'todo' }),
      suiteFinished('s1'),
      testPassed('t4'),
      runFinished({ status: 'failed', passed: 2, failed: 1, skipped: 1 }),
    ]

    expect(checkTestEventSequence(events)).toEqual([])
  })

  it('accepts a run that could not compile', () => {
    expect(checkTestEventSequence([runStarted(), diagnostics(), runFinished({ status: 'errored' })])).toEqual([])
  })

  it('rejects an empty run', () => {
    expect(checkTestEventSequence([])).toEqual(violation('RunStarted'))
  })

  it('requires RunStarted first', () => {
    expect(checkTestEventSequence([testPassed('t1'), runStarted(), runFinished({ passed: 1 })])).toEqual(
      violation('#0 TestPassed: the run must start with RunStarted')
    )
  })

  it('requires RunFinished last', () => {
    expect(checkTestEventSequence([runStarted(), testPassed('t1')])).toEqual(violation('RunFinished'))
  })

  it('rejects events after RunFinished', () => {
    expect(checkTestEventSequence([runStarted(), runFinished(), testPassed('t1')])).toEqual(
      violation('#2 TestPassed: event after RunFinished')
    )
  })

  it('rejects an event from another run', () => {
    expect(
      checkTestEventSequence([runStarted(), testPassed('t1', { runId: 'run-2' }), runFinished({ passed: 1 })])
    ).toEqual(violation('#1 TestPassed: runId "run-2"'))
  })

  it('rejects a suite left open', () => {
    expect(checkTestEventSequence([runStarted(), suiteStarted('s1'), runFinished()])).toEqual(
      violation('#2 RunFinished: suite "s1" is still open')
    )
  })

  it('rejects a suite closed out of order', () => {
    const events = [
      runStarted(),
      suiteStarted('s1'),
      suiteStarted('s2', { parentId: 's1' }),
      suiteFinished('s1'),
      suiteFinished('s2'),
      runFinished(),
    ]

    expect(checkTestEventSequence(events)).toContainEqual(expect.stringContaining('#3 SuiteFinished: closes "s1"'))
  })

  it('rejects a suite whose parent is not the open suite', () => {
    expect(
      checkTestEventSequence([runStarted(), suiteStarted('s2', { parentId: 's1' }), suiteFinished('s2'), runFinished()])
    ).toEqual(violation('#1 SuiteStarted: parent "s1" is not the innermost open suite'))
  })

  it('rejects a test attached to a suite that is not open', () => {
    expect(
      checkTestEventSequence([runStarted(), testPassed('t1', { suiteId: 's1' }), runFinished({ passed: 1 })])
    ).toEqual(violation('#1 TestPassed: suite "s1" is not the innermost open suite'))
  })

  it('rejects a duplicated test id', () => {
    expect(
      checkTestEventSequence([runStarted(), testPassed('t1'), testPassed('t1'), runFinished({ passed: 2 })])
    ).toEqual(violation('#2 TestPassed: duplicate testId "t1"'))
  })

  it('rejects counts that do not match the reported tests', () => {
    expect(checkTestEventSequence([runStarted(), testPassed('t1'), runFinished({ passed: 2 })])).toEqual(
      violation('#2 RunFinished: reports 2 passed, 0 failed, 0 skipped but saw 1 passed, 0 failed, 0 skipped')
    )
  })

  it('rejects a status that contradicts the failures', () => {
    expect(
      checkTestEventSequence([runStarted(), testFailed('t1'), runFinished({ status: 'passed', failed: 1 })])
    ).toEqual(violation('#2 RunFinished: status "passed" with 1 failed test'))
  })
})

import type { TestEvent } from '@typika/runtime-core'
import { describe, expect, it } from 'vitest'

import { testRunOf } from './test-run-of.ts'

const test = { runId: 'r', testId: 't', name: 'adds', file: 'src/test/kotlin/MoneyTest.kt' }

describe('testRunOf', () => {
  it('lists the status of each test with its file', () => {
    const events: ReadonlyArray<TestEvent> = [
      { _tag: 'TestPassed', ...test, durationMs: 1 },
      { _tag: 'TestFailed', ...test, durationMs: 1, failure: { message: 'no' } },
      { _tag: 'TestSkipped', ...test },
    ]

    expect(testRunOf(events)).toEqual({
      _tag: 'Tested',
      tests: [
        { file: test.file, status: 'passed' },
        { file: test.file, status: 'failed' },
        { file: test.file, status: 'skipped' },
      ],
    })
  })

  it('reports the errors of a build that failed', () => {
    const events: ReadonlyArray<TestEvent> = [
      {
        _tag: 'Diagnostics',
        runId: 'r',
        diagnostics: [
          { severity: 'error', message: 'type mismatch', location: { file: 'src/main/kotlin/Main.kt', line: 2 } },
          { severity: 'error', message: 'unresolved reference' },
        ],
      },
    ]

    expect(testRunOf(events)).toEqual({
      _tag: 'BuildFailed',
      message: 'src/main/kotlin/Main.kt:2: type mismatch; unresolved reference',
    })
  })

  it('does not take a warning for a failed build', () => {
    const events: ReadonlyArray<TestEvent> = [
      { _tag: 'Diagnostics', runId: 'r', diagnostics: [{ severity: 'warning', message: 'unused variable' }] },
      { _tag: 'TestPassed', ...test, durationMs: 1 },
    ]

    expect(testRunOf(events)).toEqual({ _tag: 'Tested', tests: [{ file: test.file, status: 'passed' }] })
  })
})

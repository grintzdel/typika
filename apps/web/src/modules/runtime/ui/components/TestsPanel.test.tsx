import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EMPTY_TEST_RUN, type TestRunState } from '../../core/domain/test-run.domain-model.ts'
import { TestsPanel } from './TestsPanel.tsx'

const finishedRun: TestRunState = {
  ...EMPTY_TEST_RUN,
  outcome: { _tag: 'Finished', status: 'failed', durationMs: 12 },
  counts: { passed: 2, failed: 1, skipped: 0 },
  tests: [
    { testId: 'a', name: 'is free', file: 'tests/a.test.ts', suitePath: ['shipping'], status: 'passed', durationMs: 1 },
    {
      testId: 'b',
      name: 'adds tax',
      file: 'tests/a.test.ts',
      suitePath: ['shipping'],
      status: 'passed',
      durationMs: 1,
    },
    {
      testId: 'c',
      name: 'charges 4.90',
      file: 'tests/b.test.ts',
      suitePath: [],
      status: 'failed',
      durationMs: 2,
      failure: { message: 'expected 500 to be 490', location: { file: 'tests/b.test.ts', line: 9, column: 5 } },
    },
  ],
}

const region = () => screen.getByRole('region', { name: 'Résultats des tests' })

describe('TestsPanel', () => {
  it('invites to run the tests before the first run', () => {
    render(<TestsPanel run={undefined} />)

    expect(region().textContent).toContain('Lancez « Tests »')
  })

  it('summarises the run', () => {
    render(<TestsPanel run={finishedRun} />)

    expect(within(region()).getByText('2 réussis')).toBeTruthy()
    expect(within(region()).getByText('1 échec')).toBeTruthy()
  })

  it('lists tests by file with their suite path', () => {
    render(<TestsPanel run={finishedRun} />)

    expect(screen.getByRole('heading', { name: 'tests/a.test.ts' })).toBeTruthy()
    expect(screen.getByText('shipping › is free')).toBeTruthy()
  })

  it('shows the failure message and its location', () => {
    render(<TestsPanel run={finishedRun} />)

    const failed = screen.getAllByRole('listitem').find((item) => item.textContent?.includes('charges 4.90'))
    if (failed === undefined) throw new Error('The failed test is not listed')
    expect(failed.textContent).toContain('expected 500 to be 490')
    expect(failed.textContent).toContain('tests/b.test.ts:9:5')
    expect(within(failed).getByText('Échoué')).toBeTruthy()
  })

  it('shows the diagnostics of an errored run', () => {
    render(
      <TestsPanel
        run={{
          ...EMPTY_TEST_RUN,
          outcome: { _tag: 'Finished', status: 'errored', durationMs: 0 },
          diagnostics: [
            { severity: 'error', message: 'Unexpected token', location: { file: 'tests/a.test.ts', line: 3 } },
          ],
        }}
      />
    )

    expect(screen.getByText('Les tests n’ont pas pu s’exécuter')).toBeTruthy()
    expect(screen.getByText('tests/a.test.ts:3 Unexpected token')).toBeTruthy()
  })
})

import type { TestEvent } from '../domain/test-event.domain-model.ts'

type EventOf<Tag extends TestEvent['_tag']> = Extract<TestEvent, { readonly _tag: Tag }>
type Overrides<Tag extends TestEvent['_tag']> = Partial<Omit<EventOf<Tag>, '_tag'>>

export const RUN_ID = 'run-1'

export const runStarted = (overrides: Overrides<'RunStarted'> = {}): EventOf<'RunStarted'> => ({
  _tag: 'RunStarted',
  runId: RUN_ID,
  startedAt: 0,
  ...overrides,
})

export const suiteStarted = (suiteId: string, overrides: Overrides<'SuiteStarted'> = {}): EventOf<'SuiteStarted'> => ({
  _tag: 'SuiteStarted',
  runId: RUN_ID,
  suiteId,
  name: suiteId,
  file: 'src/order.test.ts',
  ...overrides,
})

export const suiteFinished = (suiteId: string): EventOf<'SuiteFinished'> => ({
  _tag: 'SuiteFinished',
  runId: RUN_ID,
  suiteId,
})

export const testPassed = (testId: string, overrides: Overrides<'TestPassed'> = {}): EventOf<'TestPassed'> => ({
  _tag: 'TestPassed',
  runId: RUN_ID,
  testId,
  name: testId,
  file: 'src/order.test.ts',
  durationMs: 1,
  ...overrides,
})

export const testFailed = (testId: string, overrides: Overrides<'TestFailed'> = {}): EventOf<'TestFailed'> => ({
  _tag: 'TestFailed',
  runId: RUN_ID,
  testId,
  name: testId,
  file: 'src/order.test.ts',
  durationMs: 1,
  failure: { message: 'expected 1 to be 2' },
  ...overrides,
})

export const testSkipped = (testId: string, overrides: Overrides<'TestSkipped'> = {}): EventOf<'TestSkipped'> => ({
  _tag: 'TestSkipped',
  runId: RUN_ID,
  testId,
  name: testId,
  file: 'src/order.test.ts',
  ...overrides,
})

export const diagnostics = (overrides: Overrides<'Diagnostics'> = {}): EventOf<'Diagnostics'> => ({
  _tag: 'Diagnostics',
  runId: RUN_ID,
  diagnostics: [{ severity: 'error', message: 'Cannot find name "Order"' }],
  ...overrides,
})

export const runFinished = (overrides: Overrides<'RunFinished'> = {}): EventOf<'RunFinished'> => ({
  _tag: 'RunFinished',
  runId: RUN_ID,
  status: 'passed',
  passed: 0,
  failed: 0,
  skipped: 0,
  durationMs: 1,
  ...overrides,
})

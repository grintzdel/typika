import type { TestEvent } from '@typika/runtime-core'

import type { TestRun } from '../check-exercises/check-exercises.ts'

const STATUSES = { TestPassed: 'passed', TestFailed: 'failed', TestSkipped: 'skipped' } as const

export const testRunOf = (events: ReadonlyArray<TestEvent>): TestRun => {
  const diagnostics = events
    .flatMap((event) => (event._tag === 'Diagnostics' ? event.diagnostics : []))
    .filter((diagnostic) => diagnostic.severity === 'error')
  if (diagnostics.length > 0) {
    return {
      _tag: 'BuildFailed',
      message: diagnostics
        .map((diagnostic) =>
          diagnostic.location === undefined
            ? diagnostic.message
            : `${diagnostic.location.file}:${diagnostic.location.line}: ${diagnostic.message}`
        )
        .join('; '),
    }
  }
  return {
    _tag: 'Tested',
    tests: events.flatMap((event) =>
      event._tag === 'TestPassed' || event._tag === 'TestFailed' || event._tag === 'TestSkipped'
        ? [{ file: event.file, status: STATUSES[event._tag] }]
        : []
    ),
  }
}

import { RunStatus, type TestEvent } from '../domain/test-event.domain-model.ts'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const checkTestEventSequence = (events: ReadonlyArray<TestEvent>): ReadonlyArray<string> => {
  const first = events[0]
  if (first === undefined) return ['the run is empty: it must start with RunStarted and end with RunFinished']

  const violations: Array<string> = []
  const report = (index: number, event: TestEvent, message: string) => {
    violations.push(`#${index} ${event._tag}: ${message}`)
  }
  const openSuites: Array<string> = []
  const testIds = new Set<string>()
  const seen = { passed: 0, failed: 0, skipped: 0 }
  let starts = 0
  let finished = false

  if (first._tag !== 'RunStarted') report(0, first, 'the run must start with RunStarted')

  for (const [index, event] of events.entries()) {
    if (finished) {
      report(index, event, 'event after RunFinished')
      continue
    }
    if (event.runId !== first.runId) report(index, event, `runId "${event.runId}" differs from "${first.runId}"`)
    const innermost = openSuites.at(-1)

    switch (event._tag) {
      case 'RunStarted':
        starts += 1
        if (starts > 1) report(index, event, 'RunStarted must appear only once')
        break
      case 'SuiteStarted':
        if (event.parentId !== innermost) {
          report(
            index,
            event,
            event.parentId === undefined
              ? `top-level suite opened inside "${innermost}"`
              : `parent "${event.parentId}" is not the innermost open suite`
          )
        }
        openSuites.push(event.suiteId)
        break
      case 'SuiteFinished': {
        if (event.suiteId !== innermost) {
          report(index, event, `closes "${event.suiteId}" while the innermost open suite is "${innermost ?? 'none'}"`)
        }
        const position = openSuites.lastIndexOf(event.suiteId)
        if (position !== -1) openSuites.splice(position, 1)
        break
      }
      case 'TestPassed':
      case 'TestFailed':
      case 'TestSkipped':
        if (event.suiteId !== undefined && event.suiteId !== innermost) {
          report(index, event, `suite "${event.suiteId}" is not the innermost open suite`)
        }
        if (testIds.has(event.testId)) report(index, event, `duplicate testId "${event.testId}"`)
        testIds.add(event.testId)
        if (event._tag === 'TestPassed') seen.passed += 1
        else if (event._tag === 'TestFailed') seen.failed += 1
        else seen.skipped += 1
        break
      case 'RunFinished': {
        finished = true
        for (const suiteId of openSuites) report(index, event, `suite "${suiteId}" is still open`)
        if (event.passed !== seen.passed || event.failed !== seen.failed || event.skipped !== seen.skipped) {
          report(
            index,
            event,
            `reports ${event.passed} passed, ${event.failed} failed, ${event.skipped} skipped` +
              ` but saw ${seen.passed} passed, ${seen.failed} failed, ${seen.skipped} skipped`
          )
        }
        const expected = event.failed === 0 ? RunStatus.PASSED : RunStatus.FAILED
        if (event.status !== RunStatus.ERRORED && event.status !== expected) {
          report(index, event, `status "${event.status}" with ${plural(event.failed, 'failed test')}`)
        }
        break
      }
      case 'Diagnostics':
      case 'Output':
        break
    }
  }

  if (!finished) violations.push('the run must end with RunFinished')
  return violations
}

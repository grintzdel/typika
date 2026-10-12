import { makeSuiteId, makeTestId, type TestEvent, type TestFailure } from '@typika/runtime-core'

import type { Test2JsonEvent } from '../convert-test2json/convert-test2json.ts'

export type TestTally = { passed: number; failed: number; skipped: number }

type PackageContext = {
  readonly runId: string
  readonly dir: string
  readonly fileOf: (topLevelTest: string) => string
  readonly emit: (event: TestEvent) => void
  readonly tally: TestTally
}

const FRAMING_LINE = /^(=== (RUN|PAUSE|CONT|NAME|PASS|FAIL|SKIP)|--- (PASS|FAIL|SKIP|BENCH):)/
const LOCATION = /^([^\s:]+\.go):(\d+):/

const segmentsOf = (test: string) => test.split('/')
const parentPathOf = (test: string) => segmentsOf(test).slice(0, -1)

const failureOf = (dir: string, output: ReadonlyArray<string>): TestFailure => {
  const lines = output
    .join('')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !FRAMING_LINE.test(line))
  const located = lines.map((line) => LOCATION.exec(line)).find((match) => match !== null)
  const message = lines.join('\n') || 'FAIL'
  if (located?.[1] === undefined) return { message }
  const file = located[1].includes('/') ? located[1] : [dir, located[1]].filter(Boolean).join('/')
  return { message, location: { file, line: Number(located[2]) } }
}

export const makeTest2JsonMapper = ({ runId, dir, fileOf, emit, tally }: PackageContext) => {
  const suites = new Set<string>()
  const openedSuites = new Set<string>()
  const running = new Set<string>()
  const outputs = new Map<string, Array<string>>()

  const fileFor = (test: string) => fileOf(segmentsOf(test)[0] ?? test)
  const suiteIdOf = (test: string) => makeSuiteId(fileFor(test), segmentsOf(test))
  const parentSuiteId = (test: string) => {
    const parents = parentPathOf(test)
    return parents.length === 0 ? undefined : makeSuiteId(fileFor(test), parents)
  }
  const testIdOf = (test: string) => makeTestId(fileFor(test), parentPathOf(test), segmentsOf(test).at(-1) ?? test)

  const openSuites = (test: string) => {
    const segments = segmentsOf(test)
    for (let depth = 1; depth < segments.length; depth += 1) {
      const suite = segments.slice(0, depth).join('/')
      if (suites.has(suite)) continue
      suites.add(suite)
      openedSuites.add(suite)
      running.delete(suite)
      const parentId = parentSuiteId(suite)
      emit({
        _tag: 'SuiteStarted',
        runId,
        suiteId: suiteIdOf(suite),
        ...(parentId === undefined ? {} : { parentId }),
        name: segments[depth - 1] ?? suite,
        file: fileFor(test),
      })
    }
  }

  const finish = (test: string, action: string, elapsed: number | undefined) => {
    running.delete(test)
    if (suites.has(test)) {
      if (openedSuites.delete(test)) emit({ _tag: 'SuiteFinished', runId, suiteId: suiteIdOf(test) })
      return
    }
    const suiteId = parentSuiteId(test)
    const common = {
      runId,
      testId: testIdOf(test),
      ...(suiteId === undefined ? {} : { suiteId }),
      name: segmentsOf(test).at(-1) ?? test,
      file: fileFor(test),
    }
    const durationMs = Math.round((elapsed ?? 0) * 1000)
    if (action === 'pass') {
      tally.passed += 1
      emit({ _tag: 'TestPassed', ...common, durationMs })
    } else if (action === 'skip') {
      tally.skipped += 1
      emit({ _tag: 'TestSkipped', ...common, reason: 'skip' })
    } else {
      tally.failed += 1
      emit({ _tag: 'TestFailed', ...common, durationMs, failure: failureOf(dir, outputs.get(test) ?? []) })
    }
  }

  return {
    handle: (event: Test2JsonEvent) => {
      const test = event.Test
      if (event.Action === 'output') {
        const chunk = event.Output ?? ''
        if (test !== undefined) outputs.set(test, [...(outputs.get(test) ?? []), chunk])
        const leaf = test !== undefined && !suites.has(test)
        emit({ _tag: 'Output', runId, ...(leaf ? { testId: testIdOf(test) } : {}), stream: 'stdout', chunk })
        return
      }
      if (test === undefined) return
      if (event.Action === 'run') {
        openSuites(test)
        running.add(test)
      } else if (event.Action === 'pass' || event.Action === 'fail' || event.Action === 'skip') {
        finish(test, event.Action, event.Elapsed)
      }
    },
    close: () => {
      for (const test of [...running].toReversed()) finish(test, 'fail', undefined)
      for (const suite of [...openedSuites].toReversed()) finish(suite, 'fail', undefined)
    },
  }
}

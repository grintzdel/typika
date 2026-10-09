import { appendFileSync, writeFileSync } from 'node:fs'

import { makeSuiteId, makeTestId, type Diagnostic, type TestEvent } from '@typika/runtime-core'
import type { Reporter, TestCase, TestCollection, TestModule, TestRunEndReason, TestSuite } from 'vitest/node'

type TestReporterOptions = {
  readonly outputFile?: string
}

type TestError = NonNullable<ReturnType<TestCase['result']>['errors']>[number]

const thrownValueOf = (error: TestError | undefined) => {
  const { stacks: _stacks, ...value } = (error ?? {}) as Record<string, unknown>
  return `Thrown value: ${JSON.stringify(value)}`
}

const failureOf = (error: TestError | undefined) => ({
  message: typeof error?.message === 'string' ? error.message : thrownValueOf(error),
  ...(typeof error?.expected === 'string' ? { expected: error.expected } : {}),
  ...(typeof error?.actual === 'string' ? { actual: error.actual } : {}),
  ...(typeof error?.stack === 'string' ? { stack: error.stack } : {}),
})

const skipReasonOf = (testCase: TestCase) => {
  if (testCase.options.mode === 'todo') return 'todo'
  if (testCase.options.mode === 'skip') return 'skip'
  return 'filtered'
}

export default class TypikaVitestReporter implements Reporter {
  readonly #outputFile: string | undefined
  readonly #runId = `vitest-${Date.now()}`
  #startedAt = 0

  constructor(options: TestReporterOptions = {}) {
    this.#outputFile = options.outputFile ?? process.env['TYPIKA_EVENTS_FILE']
  }

  onTestRunStart() {
    this.#startedAt = Date.now()
    if (this.#outputFile !== undefined) writeFileSync(this.#outputFile, '')
  }

  onTestRunEnd(
    testModules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<{ readonly message?: string }>,
    reason: TestRunEndReason
  ) {
    const runId = this.#runId
    const events: Array<TestEvent> = [{ _tag: 'RunStarted', runId, startedAt: this.#startedAt }]
    const counts = { passed: 0, failed: 0, skipped: 0 }
    const diagnostics: Array<Diagnostic> = []

    const reportUnattributed = (owner: TestSuite | TestModule, attributed: boolean) => {
      const errors = owner.errors()
      if (attributed || errors.length === 0) return
      const ownerDiagnostics = errors.map((error): Diagnostic => ({ severity: 'error', message: error.message }))
      diagnostics.push(...ownerDiagnostics)
      events.push({ _tag: 'Diagnostics', runId, diagnostics: ownerDiagnostics })
    }

    const walk = (
      collection: TestCollection,
      file: string,
      suitePath: ReadonlyArray<string>,
      parentId: string | undefined,
      inheritedError: TestError | undefined
    ): boolean => {
      let attributed = false
      for (const child of collection) {
        if (child.type === 'suite') {
          const path = [...suitePath, child.name]
          const suiteId = makeSuiteId(file, path)
          events.push({
            _tag: 'SuiteStarted',
            runId,
            suiteId,
            ...(parentId === undefined ? {} : { parentId }),
            name: child.name,
            file,
          })
          const suiteError = inheritedError ?? child.errors()[0]
          const childAttributed = walk(child.children, file, path, suiteId, suiteError)
          attributed ||= childAttributed
          if (inheritedError === undefined) reportUnattributed(child, childAttributed)
          events.push({ _tag: 'SuiteFinished', runId, suiteId })
          continue
        }
        const testId = makeTestId(file, suitePath, child.name)
        const base = { runId, testId, ...(parentId === undefined ? {} : { suiteId: parentId }), name: child.name, file }
        for (const log of child.logs()) {
          events.push({ _tag: 'Output', runId, testId, stream: log.type, chunk: log.content })
        }
        const result = child.result()
        const durationMs = child.diagnostic()?.duration ?? 0
        if (result.state === 'passed') {
          counts.passed += 1
          events.push({ _tag: 'TestPassed', ...base, durationMs })
        } else if (result.state === 'failed') {
          counts.failed += 1
          events.push({ _tag: 'TestFailed', ...base, durationMs, failure: failureOf(result.errors[0]) })
        } else if (result.state === 'skipped' && child.options.mode === 'run' && inheritedError !== undefined) {
          counts.failed += 1
          attributed = true
          events.push({ _tag: 'TestFailed', ...base, durationMs: 0, failure: failureOf(inheritedError) })
        } else {
          counts.skipped += 1
          events.push({ _tag: 'TestSkipped', ...base, reason: skipReasonOf(child) })
        }
      }
      return attributed
    }

    for (const testModule of testModules.toSorted((a, b) => a.relativeModuleId.localeCompare(b.relativeModuleId))) {
      const file = testModule.relativeModuleId
      if (testModule.children.size === 0) {
        reportUnattributed(testModule, false)
        continue
      }
      const moduleError = testModule.errors()[0]
      reportUnattributed(testModule, walk(testModule.children, file, [], undefined, moduleError))
    }

    const errored = diagnostics.length > 0 || unhandledErrors.length > 0 || reason === 'interrupted'
    events.push({
      _tag: 'RunFinished',
      runId,
      status: errored ? 'errored' : counts.failed === 0 ? 'passed' : 'failed',
      ...counts,
      durationMs: Date.now() - this.#startedAt,
    })

    const lines = events.map((event) => `${JSON.stringify(event)}\n`).join('')
    if (this.#outputFile === undefined) process.stdout.write(lines)
    else appendFileSync(this.#outputFile, lines)
  }
}

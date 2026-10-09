export type TestLocation = {
  readonly file: string
  readonly line: number
  readonly column?: number
}

export type TestFailure = {
  readonly message: string
  readonly expected?: string
  readonly actual?: string
  readonly stack?: string
  readonly location?: TestLocation
}

export type Diagnostic = {
  readonly severity: 'error' | 'warning'
  readonly message: string
  readonly location?: TestLocation
}

type TestFields = {
  readonly runId: string
  readonly testId: string
  readonly suiteId?: string
  readonly name: string
  readonly file: string
}

export type TestEvent =
  | { readonly _tag: 'RunStarted'; readonly runId: string; readonly startedAt: number }
  | { readonly _tag: 'Diagnostics'; readonly runId: string; readonly diagnostics: ReadonlyArray<Diagnostic> }
  | {
      readonly _tag: 'SuiteStarted'
      readonly runId: string
      readonly suiteId: string
      readonly parentId?: string
      readonly name: string
      readonly file: string
    }
  | ({ readonly _tag: 'TestPassed'; readonly durationMs: number } & TestFields)
  | ({ readonly _tag: 'TestFailed'; readonly durationMs: number; readonly failure: TestFailure } & TestFields)
  | ({ readonly _tag: 'TestSkipped'; readonly reason?: 'skip' | 'todo' | 'filtered' } & TestFields)
  | {
      readonly _tag: 'Output'
      readonly runId: string
      readonly testId?: string
      readonly stream: 'stdout' | 'stderr'
      readonly chunk: string
    }
  | { readonly _tag: 'SuiteFinished'; readonly runId: string; readonly suiteId: string }
  | {
      readonly _tag: 'RunFinished'
      readonly runId: string
      readonly status: 'passed' | 'failed' | 'errored'
      readonly passed: number
      readonly failed: number
      readonly skipped: number
      readonly durationMs: number
    }

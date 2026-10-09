import { AssertionError } from './assertion-error.ts'
import { collectFile, type Hook, type SuiteNode, type TestNode } from './collector.ts'
import type { TestEvent, TestFailure } from './events.ts'
import { formatLog } from './format-log.ts'
import { pretty } from './pretty.ts'
import { makeSuiteId, makeTestId } from './test-id.ts'

export type TestFile = {
  readonly path: string
  readonly load: () => unknown
}

export type RunTestsOptions = {
  readonly runId: string
  readonly files: ReadonlyArray<TestFile>
  readonly namePattern?: string
  readonly emit: (event: TestEvent) => void
}

const TEST_TIMEOUT_MS = 5_000
const HOOK_TIMEOUT_MS = 10_000

// Captured at load time so that vi.useFakeTimers() cannot freeze the test timeouts.
const realSetTimeout = globalThis.setTimeout.bind(globalThis)
const realClearTimeout = globalThis.clearTimeout.bind(globalThis)
const realDateNow = Date.now.bind(Date)
const now = () => globalThis.performance.now()

const CONSOLE_STREAMS = {
  log: 'stdout',
  info: 'stdout',
  debug: 'stdout',
  warn: 'stderr',
  error: 'stderr',
} as const

const timeoutError = (kind: 'test' | 'hook', ms: number) =>
  new Error(
    kind === 'test'
      ? `Test timed out in ${ms}ms.\nIf this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".`
      : `Hook timed out in ${ms}ms.\nIf this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".`
  )

const withTimeout = (fn: () => unknown, ms: number, kind: 'test' | 'hook'): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timer = realSetTimeout(() => reject(timeoutError(kind, ms)), ms)
    Promise.resolve()
      .then(fn)
      .then(
        (value) => {
          realClearTimeout(timer)
          resolve(value)
        },
        (error: unknown) => {
          realClearTimeout(timer)
          reject(error)
        }
      )
  })

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return `Thrown value: ${JSON.stringify(error) ?? String(error)}`
  } catch {
    return `Thrown value: ${String(error)}`
  }
}

export const failureOf = (error: unknown): TestFailure => {
  const stack = error instanceof Error && typeof error.stack === 'string' ? { stack: error.stack } : {}
  const diff =
    error instanceof AssertionError && error.showDiff
      ? { expected: pretty(error.expected), actual: pretty(error.actual) }
      : {}
  return { message: messageOf(error), ...diff, ...stack }
}

const hasOnly = (suite: SuiteNode): boolean =>
  suite.children.some((child) => child.mode === 'only' || (child.type === 'suite' && hasOnly(child)))

const setModeDeep = (suite: SuiteNode, mode: 'skip' | 'todo') => {
  for (const child of suite.children) {
    if (mode === 'skip' && child.mode === 'todo') continue
    child.mode = mode
    if (child.type === 'suite') setModeDeep(child, mode)
  }
}

const interpretModes = (
  suite: SuiteNode,
  onlyMode: boolean,
  parentIsOnly: boolean,
  matchesName: (fullName: string) => boolean,
  path: ReadonlyArray<string>
) => {
  const suiteIsOnly = (parentIsOnly || suite.mode === 'only') && !hasOnly(suite)
  for (const child of suite.children) {
    const included = suiteIsOnly || child.mode === 'only'
    if (onlyMode) {
      if (child.type === 'suite' && (included || hasOnly(child))) {
        if (child.mode === 'only') child.mode = 'run'
      } else if (child.mode === 'run' && !included) {
        child.mode = 'skip'
      } else if (child.mode === 'only') {
        child.mode = 'run'
      }
    }
    if (child.type === 'test') {
      if (child.mode === 'run' && !matchesName([...path, child.name].join(' '))) {
        child.mode = 'skip'
        child.filtered = true
      }
    } else if (child.mode === 'skip' || child.mode === 'todo') {
      setModeDeep(child, child.mode)
    } else {
      interpretModes(child, onlyMode, included, matchesName, [...path, child.name])
    }
  }
}

const hasRunnableTest = (suite: SuiteNode): boolean =>
  suite.children.some((child) => (child.type === 'test' ? child.mode === 'run' : hasRunnableTest(child)))

const nameMatcher = (pattern: string | undefined): ((fullName: string) => boolean) => {
  if (pattern === undefined || pattern === '') return () => true
  try {
    const regexp = new RegExp(pattern)
    return (fullName) => regexp.test(fullName)
  } catch {
    return (fullName) => fullName.includes(pattern)
  }
}

const runHooks = async (hooks: ReadonlyArray<Hook>, cleanups: Array<() => unknown>): Promise<unknown> => {
  for (const hook of hooks) {
    try {
      const result = await withTimeout(hook.fn, hook.timeout ?? HOOK_TIMEOUT_MS, 'hook')
      if (typeof result === 'function') cleanups.unshift(() => Reflect.apply(result, undefined, []))
    } catch (error) {
      return error
    }
  }
  return undefined
}

const runTeardown = async (fns: ReadonlyArray<() => unknown>): Promise<unknown> => {
  let first: unknown
  for (const fn of fns) {
    try {
      await withTimeout(fn, HOOK_TIMEOUT_MS, 'hook')
    } catch (error) {
      first ??= error
    }
  }
  return first
}

export const runTests = async ({ runId, files, namePattern, emit }: RunTestsOptions): Promise<void> => {
  const startedAt = now()
  const counts = { passed: 0, failed: 0, skipped: 0 }
  let errored = false
  let currentTestId: string | undefined
  const matchesName = nameMatcher(namePattern)

  const originalConsole = { ...console }
  for (const [method, stream] of Object.entries(CONSOLE_STREAMS)) {
    Object.assign(console, {
      [method]: (...args: Array<unknown>) => {
        const chunk = formatLog(args)
        emit({
          _tag: 'Output',
          runId,
          ...(currentTestId === undefined ? {} : { testId: currentTestId }),
          stream,
          chunk: `${chunk}\n`,
        })
      },
    })
  }

  const reportDiagnostic = (message: string) => {
    errored = true
    emit({ _tag: 'Diagnostics', runId, diagnostics: [{ severity: 'error', message }] })
  }

  const runTest = async (
    node: TestNode,
    file: string,
    suitePath: ReadonlyArray<string>,
    suiteId: string | undefined,
    chain: ReadonlyArray<SuiteNode>,
    inheritedError: unknown
  ) => {
    const testId = makeTestId(file, suitePath, node.name)
    const base = { runId, testId, ...(suiteId === undefined ? {} : { suiteId }), name: node.name, file }
    if (node.mode !== 'run' || node.fn === undefined) {
      counts.skipped += 1
      const reason = node.mode === 'todo' ? 'todo' : node.filtered ? 'filtered' : 'skip'
      emit({ _tag: 'TestSkipped', ...base, reason })
      return
    }
    if (inheritedError !== undefined) {
      counts.failed += 1
      emit({ _tag: 'TestFailed', ...base, durationMs: 0, failure: failureOf(inheritedError) })
      return
    }

    const start = now()
    currentTestId = testId
    const cleanups: Array<() => unknown> = []
    let error: unknown
    for (const suite of chain) {
      error = await runHooks(suite.hooks.beforeEach, cleanups)
      if (error !== undefined) break
    }
    if (error === undefined) {
      const fn = node.fn
      try {
        await withTimeout(fn, node.timeout ?? TEST_TIMEOUT_MS, 'test')
      } catch (testError) {
        error = testError ?? new Error('Test failed with undefined')
      }
    }
    const afterEach = chain.toReversed().flatMap((suite) => suite.hooks.afterEach.toReversed().map((hook) => hook.fn))
    const teardownError = await runTeardown([...cleanups, ...afterEach])
    error ??= teardownError
    currentTestId = undefined

    const durationMs = now() - start
    if (error === undefined) {
      counts.passed += 1
      emit({ _tag: 'TestPassed', ...base, durationMs })
    } else {
      counts.failed += 1
      emit({ _tag: 'TestFailed', ...base, durationMs, failure: failureOf(error) })
    }
  }

  const runSuite = async (
    suite: SuiteNode,
    file: string,
    path: ReadonlyArray<string>,
    parentId: string | undefined,
    chain: ReadonlyArray<SuiteNode>,
    inheritedError: unknown
  ) => {
    const isRoot = path.length === 0
    const suiteId = isRoot ? undefined : makeSuiteId(file, path)
    if (suiteId !== undefined) {
      emit({
        _tag: 'SuiteStarted',
        runId,
        suiteId,
        ...(parentId === undefined ? {} : { parentId }),
        name: suite.name,
        file,
      })
    }

    const suiteChain = [...chain, suite]
    const cleanups: Array<() => unknown> = []
    let error = inheritedError
    const runsHooks = error === undefined && hasRunnableTest(suite)
    if (runsHooks) error = await runHooks(suite.hooks.beforeAll, cleanups)

    for (const child of suite.children) {
      if (child.type === 'test') await runTest(child, file, path, suiteId, suiteChain, error)
      else await runSuite(child, file, [...path, child.name], suiteId, suiteChain, error)
    }

    if (runsHooks) {
      const afterAll = suite.hooks.afterAll.toReversed().map((hook) => hook.fn)
      const teardownError = await runTeardown([...cleanups, ...afterAll])
      if (teardownError !== undefined) reportDiagnostic(messageOf(teardownError))
    }

    if (suiteId !== undefined) emit({ _tag: 'SuiteFinished', runId, suiteId })
  }

  emit({ _tag: 'RunStarted', runId, startedAt: realDateNow() })
  try {
    for (const file of files) {
      const { root, error } = await collectFile(file.load)
      if (error !== undefined) {
        reportDiagnostic(messageOf(error))
        continue
      }
      interpretModes(root, hasOnly(root), false, matchesName, [])
      await runSuite(root, file.path, [], undefined, [], undefined)
    }
  } finally {
    Object.assign(console, originalConsole)
  }
  emit({
    _tag: 'RunFinished',
    runId,
    status: errored ? 'errored' : counts.failed === 0 ? 'passed' : 'failed',
    ...counts,
    durationMs: now() - startedAt,
  })
}

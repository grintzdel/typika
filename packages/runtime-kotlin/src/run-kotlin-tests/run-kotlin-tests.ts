import { makeSuiteId, makeTestId, RunStatus, type Diagnostic, type TestEvent } from '@typika/runtime-core'

import { describeKotlinError, headlineOf } from '../describe-kotlin-error/describe-kotlin-error.ts'
import type { LoadKotlinModule } from '../domain/kotlin-module.domain-model.ts'
import { makeKotlinConsole } from '../make-kotlin-console/make-kotlin-console.ts'
import type { MapStack } from '../map-stack/map-stack.ts'

export type RunKotlinTestsOptions = {
  readonly runId: string
  readonly load: LoadKotlinModule
  readonly mapStack: MapStack
  readonly classes: ReadonlyMap<string, string>
  readonly warnings?: ReadonlyArray<Diagnostic>
  readonly files?: ReadonlyArray<string>
  readonly namePattern?: string
  readonly emit: (event: TestEvent) => void
}

type TestNode = { readonly type: 'test'; readonly name: string; readonly ignored: boolean; readonly fn: () => unknown }
type SuiteNode = {
  readonly type: 'suite'
  readonly name: string
  readonly ignored: boolean
  readonly children: Array<SuiteNode | TestNode>
}

const nameMatcher = (pattern: string | undefined): ((fullName: string) => boolean) => {
  if (pattern === undefined || pattern === '') return () => true
  try {
    const regexp = new RegExp(pattern)
    return (fullName) => regexp.test(fullName)
  } catch {
    return (fullName) => fullName.includes(pattern)
  }
}

const withoutDefaultPackage = (suite: SuiteNode): ReadonlyArray<SuiteNode | TestNode> =>
  suite.children.flatMap((child) =>
    child.type === 'suite' && child.name === '' && !child.ignored ? withoutDefaultPackage(child) : [child]
  )

const fileOfClass = (classes: ReadonlyMap<string, string>, path: ReadonlyArray<string>): string | undefined => {
  for (let depth = path.length; depth > 0; depth -= 1) {
    const file = classes.get(path.slice(0, depth).join('.'))
    if (file !== undefined) return file
  }
  return undefined
}

const now = () => globalThis.performance.now()

export const runKotlinTests = async (options: RunKotlinTestsOptions): Promise<void> => {
  const { runId, emit, mapStack } = options
  const startedAt = now()
  const counts = { passed: 0, failed: 0, skipped: 0 }
  const matchesName = nameMatcher(options.namePattern)
  const finish = (status: RunStatus) =>
    emit({ _tag: 'RunFinished', runId, status, ...counts, durationMs: now() - startedAt })

  emit({ _tag: 'RunStarted', runId, startedAt: Date.now() })
  if (options.warnings !== undefined && options.warnings.length > 0) {
    emit({ _tag: 'Diagnostics', runId, diagnostics: options.warnings })
  }

  const root: SuiteNode = { type: 'suite', name: '', ignored: false, children: [] }
  let current = root
  let currentTestId: string | undefined
  const register = (ignored: boolean) => (name: string, fn: () => void) => {
    const suite: SuiteNode = { type: 'suite', name, ignored, children: [] }
    current.children.push(suite)
    const parent = current
    current = suite
    try {
      fn()
    } finally {
      current = parent
    }
  }
  const addTest = (ignored: boolean) => (name: string, fn: () => unknown) =>
    current.children.push({ type: 'test', name, ignored, fn })

  try {
    await options.load({
      describe: register(false),
      xdescribe: register(true),
      it: addTest(false),
      xit: addTest(true),
      console: makeKotlinConsole((stream, chunk) =>
        emit({
          _tag: 'Output',
          runId,
          ...(currentTestId === undefined ? {} : { testId: currentTestId }),
          stream,
          chunk,
        })
      ),
    })
  } catch (error) {
    emit({
      _tag: 'Diagnostics',
      runId,
      diagnostics: [{ severity: 'error', message: `The tests could not load: ${headlineOf(error)}` }],
    })
    finish(RunStatus.ERRORED)
    return
  }

  const topLevel = withoutDefaultPackage(root)
  const fileOf = (path: ReadonlyArray<string>) => fileOfClass(options.classes, path) ?? ''

  const filesOf = (nodes: ReadonlyArray<SuiteNode | TestNode>, path: ReadonlyArray<string>): ReadonlyArray<string> =>
    nodes.flatMap((node) => (node.type === 'test' ? [fileOf(path)] : filesOf(node.children, [...path, node.name])))

  const runTest = async (
    node: TestNode,
    file: string,
    path: ReadonlyArray<string>,
    suiteId: string | undefined,
    ignored: boolean
  ) => {
    const testId = makeTestId(file, path, node.name)
    const base = { runId, testId, ...(suiteId === undefined ? {} : { suiteId }), name: node.name, file }
    if (ignored || node.ignored) {
      counts.skipped += 1
      emit({ _tag: 'TestSkipped', ...base, reason: 'skip' })
      return
    }
    if (!matchesName([...path, node.name].join(' '))) {
      counts.skipped += 1
      emit({ _tag: 'TestSkipped', ...base, reason: 'filtered' })
      return
    }
    const start = now()
    currentTestId = testId
    try {
      await node.fn()
      counts.passed += 1
      currentTestId = undefined
      emit({ _tag: 'TestPassed', ...base, durationMs: now() - start })
    } catch (error) {
      counts.failed += 1
      currentTestId = undefined
      emit({
        _tag: 'TestFailed',
        ...base,
        durationMs: now() - start,
        failure: describeKotlinError(error, mapStack, file),
      })
    }
  }

  const runNodes = async (
    nodes: ReadonlyArray<SuiteNode | TestNode>,
    file: string,
    path: ReadonlyArray<string>,
    parentId: string | undefined,
    ignored: boolean
  ): Promise<void> => {
    for (const node of nodes) {
      if (node.type === 'test') {
        if (fileOf(path) === file) await runTest(node, file, path, parentId, ignored)
        continue
      }
      const suitePath = [...path, node.name]
      if (!filesOf(node.children, suitePath).includes(file)) continue
      const suiteId = makeSuiteId(file, suitePath)
      emit({
        _tag: 'SuiteStarted',
        runId,
        suiteId,
        ...(parentId === undefined ? {} : { parentId }),
        name: node.name,
        file,
      })
      await runNodes(node.children, file, suitePath, suiteId, ignored || node.ignored)
      emit({ _tag: 'SuiteFinished', runId, suiteId })
    }
  }

  const files = [...new Set(filesOf(topLevel, []))].filter(
    (file) => options.files === undefined || options.files.includes(file)
  )
  for (const file of files) await runNodes(topLevel, file, [], undefined, false)
  finish(counts.failed > 0 ? RunStatus.FAILED : RunStatus.PASSED)
}

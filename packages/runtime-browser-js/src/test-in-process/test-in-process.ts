import process from 'node:process'

import type { Diagnostic, ProjectSnapshot, TestEvent } from '@typika/runtime-core'
import * as vitestApi from '@typika/test-runner'
import { runTests } from '@typika/test-runner/runner'
import type * as esbuild from 'esbuild-wasm'

import { bundle } from '../bundle/bundle.ts'
import { DEFAULT_PACKAGE_URL_TEMPLATE } from '../domain/constants/default-package-url-template.constant.ts'
import { selectTestFiles } from '../select-test-files/select-test-files.ts'
import { VITEST_GLOBAL } from '../vitest-shim/vitest-shim.ts'

export type InProcessTest = {
  readonly file: string
  readonly name: string
  readonly status: 'passed' | 'failed' | 'skipped'
}

export type InProcessTestResult =
  | { readonly _tag: 'Tested'; readonly tests: ReadonlyArray<InProcessTest> }
  | { readonly _tag: 'BuildFailed'; readonly diagnostics: ReadonlyArray<Diagnostic> }

const STATUSES = { TestPassed: 'passed', TestFailed: 'failed', TestSkipped: 'skipped' } as const

let runCount = 0

const toDataUrl = (code: string, run: number) =>
  `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}#run-${run}`

const ignore = () => undefined

const withUncaughtExceptionsIgnored = async (run: () => Promise<void>) => {
  const listeners = process.listeners('uncaughtException')
  process.removeAllListeners('uncaughtException')
  process.on('uncaughtException', ignore)
  try {
    await run()
  } finally {
    // Node rethrows an EventTarget listener's error on nextTick, only once the microtasks have drained.
    await new Promise((resolve) => setImmediate(resolve))
    process.off('uncaughtException', ignore)
    for (const listener of listeners) process.on('uncaughtException', listener)
  }
}

const testOf = (event: TestEvent): ReadonlyArray<InProcessTest> =>
  event._tag === 'TestPassed' || event._tag === 'TestFailed' || event._tag === 'TestSkipped'
    ? [{ file: event.file, name: event.name, status: STATUSES[event._tag] }]
    : []

export const testInProcess = async (
  build: Pick<typeof esbuild, 'build'>,
  snapshot: ProjectSnapshot,
  packageUrlTemplate: string = DEFAULT_PACKAGE_URL_TEMPLATE
): Promise<InProcessTestResult> => {
  const files = selectTestFiles(snapshot, {})
  const result = await bundle(build, snapshot.files, { _tag: 'Test', files }, packageUrlTemplate)
  if (result._tag === 'Failed') return { _tag: 'BuildFailed', diagnostics: result.diagnostics }
  Object.assign(globalThis, { [Symbol.for(VITEST_GLOBAL)]: vitestApi })
  runCount += 1
  const run = runCount
  const events: Array<TestEvent> = []
  await withUncaughtExceptionsIgnored(() =>
    runTests({
      runId: 'in-process',
      files: result.modules.map((module) => ({ path: module.path, load: () => import(toDataUrl(module.code, run)) })),
      emit: (event) => events.push(event),
    })
  )
  return { _tag: 'Tested', tests: events.flatMap(testOf) }
}

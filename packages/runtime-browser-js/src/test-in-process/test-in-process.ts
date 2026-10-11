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

const toDataUrl = (code: string) => `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`

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
  const events: Array<TestEvent> = []
  await runTests({
    runId: 'in-process',
    files: result.modules.map((module) => ({ path: module.path, load: () => import(toDataUrl(module.code)) })),
    emit: (event) => events.push(event),
  })
  return { _tag: 'Tested', tests: events.flatMap(testOf) }
}

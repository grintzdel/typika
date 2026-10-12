import { makeIssue, ManifestIssueCode } from '@typika/manifest'
import type { TestEvent } from '@typika/runtime-core'
import { findUnavailableImports, makeGoProject, type GoToolchain } from '@typika/runtime-go'
import * as Effect from 'effect/Effect'

import type { TestRun } from '../check-exercises/check-exercises.ts'
import type { TemplateRunner } from '../check-templates/check-templates.ts'

const STATUSES = { TestPassed: 'passed', TestFailed: 'failed', TestSkipped: 'skipped' } as const

const testRunOf = (events: ReadonlyArray<TestEvent>): TestRun => {
  const diagnostics = events.flatMap((event) => (event._tag === 'Diagnostics' ? event.diagnostics : []))
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

export const makeGoRunner = (toolchain: GoToolchain): TemplateRunner => {
  const project = makeGoProject(toolchain)
  const std = new Set(toolchain.std.keys())
  return {
    runTests: (files) =>
      Effect.promise(async () => {
        const events: Array<TestEvent> = []
        project.sync(files)
        await project.test({ runId: 'template-check' }, (event) => events.push(event))
        return testRunOf(events)
      }),
    checkFiles: (files) =>
      findUnavailableImports(files, std).map((diagnostic) =>
        makeIssue(
          ManifestIssueCode.GO_IMPORT_UNAVAILABLE,
          diagnostic.location === undefined ? 'go.mod' : `${diagnostic.location.file}:${diagnostic.location.line}`,
          diagnostic.message
        )
      ),
  }
}

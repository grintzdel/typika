import { makeIssue, ManifestIssueCode } from '@typika/manifest'
import type { TestEvent } from '@typika/runtime-core'
import { findUnavailableImports, makeGoProject, type GoToolchain } from '@typika/runtime-go'
import * as Effect from 'effect/Effect'

import type { TemplateRunner } from '../check-templates/check-templates.ts'
import { testRunOf } from '../test-run-of/test-run-of.ts'

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

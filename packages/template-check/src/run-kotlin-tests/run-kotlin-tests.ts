import type { TestEvent } from '@typika/runtime-core'
import { DEFAULT_TEST_GLOBS, makeKotlinCompilerClient, makeKotlinProject } from '@typika/runtime-kotlin'
import { inProcessKotlinExecutor } from '@typika/runtime-kotlin/node'
import * as Effect from 'effect/Effect'

import type { TestRun } from '../check-exercises/check-exercises.ts'
import type { TemplateRunner } from '../check-templates/check-templates.ts'
import { testRunOf } from '../test-run-of/test-run-of.ts'

export const makeKotlinRunner = (compilerUrl: string): TemplateRunner => {
  const project = makeKotlinProject(makeKotlinCompilerClient({ url: compilerUrl }), inProcessKotlinExecutor)
  return {
    runTests: (files, manifest) => {
      const events: Array<TestEvent> = []
      return Effect.scoped(
        project.test(
          files,
          { runId: 'template-check', testGlobs: manifest.tests?.include ?? DEFAULT_TEST_GLOBS },
          (event) => events.push(event)
        )
      ).pipe(
        Effect.map(() => testRunOf(events)),
        Effect.catch((error) =>
          Effect.succeed<TestRun>({ _tag: 'BuildFailed', message: `the Kotlin compiler failed: ${error._tag}` })
        )
      )
    },
  }
}

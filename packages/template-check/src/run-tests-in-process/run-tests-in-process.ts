import { RuntimeKind } from '@typika/manifest'
import { testInProcess } from '@typika/runtime-browser-js/in-process'
import { ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import * as esbuild from 'esbuild-wasm'

import type { RunTests } from '../check-exercises/check-exercises.ts'
import type { TemplateRunners } from '../check-templates/check-templates.ts'

const toProjectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const runTestsInProcess: RunTests = (files, manifest) =>
  Effect.promise(() =>
    testInProcess(esbuild, {
      files: new Map([...files].map(([path, content]) => [toProjectPath(path), content])),
      manifest,
    })
  ).pipe(
    Effect.map((result) =>
      result._tag === 'Tested'
        ? result
        : {
            _tag: 'BuildFailed' as const,
            message: result.diagnostics
              .map((diagnostic) =>
                diagnostic.location === undefined
                  ? diagnostic.message
                  : `${diagnostic.location.file}:${diagnostic.location.line}: ${diagnostic.message}`
              )
              .join('; '),
          }
    )
  )

export const inProcessRunners: TemplateRunners = { [RuntimeKind.BROWSER_JS]: { runTests: runTestsInProcess } }

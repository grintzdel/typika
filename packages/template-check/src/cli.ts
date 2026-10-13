import { resolve } from 'node:path'
import { argv, env, exit } from 'node:process'

import * as Effect from 'effect/Effect'

import { checkTemplates } from './check-templates/check-templates.ts'
import { formatReport, hasErrors } from './format-report/format-report.ts'
import { loadTemplateRunners } from './load-template-runners/load-template-runners.ts'
import { listFilesWithGit, readTemplates } from './read-templates/read-templates.ts'

const root = resolve(argv[2] ?? 'templates')
const kotlinCompilerUrl = env['KOTLIN_COMPILER_URL'] || undefined
const runners = await loadTemplateRunners(kotlinCompilerUrl === undefined ? {} : { kotlinCompilerUrl })
const checks = await Effect.runPromise(checkTemplates(await readTemplates(root, listFilesWithGit), runners))
console.log(formatReport(checks))
if (kotlinCompilerUrl === undefined)
  console.log('KOTLIN_COMPILER_URL is not set: the exercises of Kotlin templates were not run.')
exit(hasErrors(checks) ? 1 : 0)

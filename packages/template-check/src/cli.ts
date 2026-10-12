import { resolve } from 'node:path'
import { argv, exit } from 'node:process'

import * as Effect from 'effect/Effect'

import { checkTemplates } from './check-templates/check-templates.ts'
import { formatReport, hasErrors } from './format-report/format-report.ts'
import { loadTemplateRunners } from './load-template-runners/load-template-runners.ts'
import { listFilesWithGit, readTemplates } from './read-templates/read-templates.ts'

const root = resolve(argv[2] ?? 'templates')
const runners = await loadTemplateRunners()
const checks = await Effect.runPromise(checkTemplates(await readTemplates(root, listFilesWithGit), runners))
console.log(formatReport(checks))
exit(hasErrors(checks) ? 1 : 0)

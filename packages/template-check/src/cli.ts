import { resolve } from 'node:path'
import { argv, exit } from 'node:process'

import { RuntimeKind } from '@typika/manifest'
import { loadGoToolchainFromDisk } from '@typika/runtime-go/node'
import * as Effect from 'effect/Effect'

import { checkTemplates } from './check-templates/check-templates.ts'
import { formatReport, hasErrors } from './format-report/format-report.ts'
import { listFilesWithGit, readTemplates } from './read-templates/read-templates.ts'
import { makeGoRunner } from './run-go-tests/run-go-tests.ts'
import { inProcessRunners } from './run-tests-in-process/run-tests-in-process.ts'

const root = resolve(argv[2] ?? 'templates')
const runners = { ...inProcessRunners, [RuntimeKind.GO]: makeGoRunner(await loadGoToolchainFromDisk()) }
const checks = await Effect.runPromise(checkTemplates(await readTemplates(root, listFilesWithGit), runners))
console.log(formatReport(checks))
exit(hasErrors(checks) ? 1 : 0)

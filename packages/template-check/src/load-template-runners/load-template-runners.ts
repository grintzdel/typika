import { RuntimeKind } from '@typika/manifest'
import { loadGoToolchainFromDisk } from '@typika/runtime-go/node'

import type { TemplateRunners } from '../check-templates/check-templates.ts'
import { makeGoRunner } from '../run-go-tests/run-go-tests.ts'
import { inProcessRunners } from '../run-tests-in-process/run-tests-in-process.ts'

export const loadTemplateRunners = async (): Promise<TemplateRunners> => ({
  ...inProcessRunners,
  [RuntimeKind.GO]: makeGoRunner(await loadGoToolchainFromDisk()),
})

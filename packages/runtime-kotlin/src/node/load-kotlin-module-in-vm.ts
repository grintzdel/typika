import { createContext, runInContext } from 'node:vm'

import type { KotlinModuleLoader } from '../domain/kotlin-job.domain-model.ts'

const FILENAME = 'typika-kotlin-program.mjs'

// Run as a script in a fresh context: without `process`, Kotlin's println writes to our console, not to stdout.
export const loadKotlinModuleInVm: KotlinModuleLoader = (code) => ({
  moduleUrl: FILENAME,
  load: async (globals) => {
    runInContext(`"use strict";${code}`, createContext({ ...globals }), { filename: FILENAME })
  },
})

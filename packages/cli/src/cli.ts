#!/usr/bin/env node
import { argv, cwd, exit } from 'node:process'

import { runCli } from './run-cli/run-cli.ts'

exit(
  await runCli(argv.slice(2), {
    cwd: cwd(),
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  })
)

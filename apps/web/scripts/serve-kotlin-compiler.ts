import { spawn, spawnSync } from 'node:child_process'
import { argv, exit } from 'node:process'

import { buildKotlinCompilerImage, hardenedRunArgs, KOTLIN_COMPILER_IMAGE } from '@typika/kotlin-compiler/container'

const NAME = 'typika-e2e-kotlin-compiler'
const port = argv[2] ?? '3080'

const remove = () => spawnSync('docker', ['rm', '-f', NAME], { stdio: 'ignore' })

buildKotlinCompilerImage()
remove()
const service = spawn(
  'docker',
  ['run', '--rm', '--name', NAME, '--publish', `127.0.0.1:${port}:8080`, ...hardenedRunArgs(), KOTLIN_COMPILER_IMAGE],
  { stdio: 'inherit' }
)
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    remove()
    exit(0)
  })
}
service.on('exit', (code) => exit(code ?? 0))

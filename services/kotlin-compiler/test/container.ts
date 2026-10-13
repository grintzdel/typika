import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { readyWorkers, waitUntil } from './compile-client.ts'

export type KotlinCompilerContainer = { readonly url: string; readonly container: string }

const serviceDir = fileURLToPath(new URL('..', import.meta.url))
const image = 'typika-kotlin-compiler:test'

const docker = (...args: Array<string>) => execFileSync('docker', args, { encoding: 'utf8' }).trim()

export const KOTLIN_COMPILER_IMAGE = image

export const hardenedRunArgs = (env: Record<string, string> = {}): Array<string> => [
  '--read-only',
  '--tmpfs',
  '/tmp:size=64m,mode=1777',
  '--cap-drop',
  'ALL',
  '--security-opt',
  'no-new-privileges',
  '--memory',
  '1g',
  '--memory-swap',
  '1g',
  '--cpus',
  '2',
  '--pids-limit',
  '256',
  ...Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
]

export const buildKotlinCompilerImage = () => {
  docker('build', '--quiet', '--tag', image, serviceDir)
}

export const startKotlinCompiler = (name: string, env: Record<string, string> = {}): KotlinCompilerContainer => {
  docker('rm', '-f', name)
  docker('run', '--detach', '--name', name, '--publish', '127.0.0.1::8080', ...hardenedRunArgs(env), image)
  const port = docker('port', name, '8080/tcp').split('\n')[0]?.split(':').at(-1)
  return { url: `http://127.0.0.1:${port}`, container: name }
}

export const waitForKotlinCompiler = ({ url }: KotlinCompilerContainer, workers = 2) =>
  waitUntil(readyWorkers(url, workers), 120_000, `${url} to start`)

export const removeKotlinCompilers = (...containers: ReadonlyArray<KotlinCompilerContainer>) => {
  docker('rm', '-f', ...containers.map(({ container }) => container))
}

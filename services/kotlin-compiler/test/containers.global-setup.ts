import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import type { TestProject } from 'vitest/node'

import { readyWorkers, waitUntil } from './compile-client.ts'

const serviceDir = fileURLToPath(new URL('..', import.meta.url))
const image = 'typika-kotlin-compiler:test'

export const ALLOWED_ORIGIN = 'http://app.typika.test'

export const LIMITED_ENV = {
  KOTLIN_COMPILER_CONCURRENCY: '2',
  KOTLIN_COMPILER_QUEUE_MAX: '0',
  KOTLIN_COMPILER_TIMEOUT_MS: '4000',
  KOTLIN_COMPILER_MAX_BODY_KB: '64',
  KOTLIN_COMPILER_CACHE_MB: '0',
}

declare module 'vitest' {
  export interface ProvidedContext {
    defaultService: { url: string; container: string }
    limitedService: { url: string; container: string }
  }
}

const docker = (...args: Array<string>) => execFileSync('docker', args, { encoding: 'utf8' }).trim()

const start = (name: string, env: Record<string, string>) => {
  docker('rm', '-f', name)
  docker(
    'run',
    '--detach',
    '--name',
    name,
    '--publish',
    '127.0.0.1::8080',
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
    image
  )
  const port = docker('port', name, '8080/tcp').split('\n')[0]?.split(':').at(-1)
  return { url: `http://127.0.0.1:${port}`, container: name }
}

export default async function setup(project: TestProject) {
  docker('build', '--quiet', '--tag', image, serviceDir)
  const defaultService = start('typika-kotlin-compiler-test-default', {
    KOTLIN_COMPILER_ALLOWED_ORIGIN: ALLOWED_ORIGIN,
  })
  const limitedService = start('typika-kotlin-compiler-test-limited', LIMITED_ENV)
  await Promise.all(
    [defaultService, limitedService].map(({ url }) => waitUntil(readyWorkers(url, 2), 120_000, `${url} to start`))
  )
  project.provide('defaultService', defaultService)
  project.provide('limitedService', limitedService)
  return () => {
    docker('rm', '-f', defaultService.container, limitedService.container)
  }
}

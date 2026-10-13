import type { TestProject } from 'vitest/node'

import {
  buildKotlinCompilerImage,
  removeKotlinCompilers,
  startKotlinCompiler,
  waitForKotlinCompiler,
  type KotlinCompilerContainer,
} from './container.ts'

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
    defaultService: KotlinCompilerContainer
    limitedService: KotlinCompilerContainer
  }
}

export default async function setup(project: TestProject) {
  buildKotlinCompilerImage()
  const defaultService = startKotlinCompiler('typika-kotlin-compiler-test-default', {
    KOTLIN_COMPILER_ALLOWED_ORIGIN: ALLOWED_ORIGIN,
  })
  const limitedService = startKotlinCompiler('typika-kotlin-compiler-test-limited', LIMITED_ENV)
  await Promise.all([defaultService, limitedService].map((service) => waitForKotlinCompiler(service)))
  project.provide('defaultService', defaultService)
  project.provide('limitedService', limitedService)
  return () => removeKotlinCompilers(defaultService, limitedService)
}

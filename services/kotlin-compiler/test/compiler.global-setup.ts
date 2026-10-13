import type { TestProject } from 'vitest/node'

import {
  buildKotlinCompilerImage,
  removeKotlinCompilers,
  startKotlinCompiler,
  waitForKotlinCompiler,
} from './container.ts'

const WORKERS = 1

export default async function setup(project: TestProject) {
  const existing = process.env['KOTLIN_COMPILER_URL']
  if (existing !== undefined && existing !== '') {
    project.provide('kotlinCompilerUrl', existing)
    return undefined
  }

  buildKotlinCompilerImage()
  const service = startKotlinCompiler(`typika-kotlin-compiler-${project.name.replaceAll(/[^\w.-]+/g, '-')}`, {
    KOTLIN_COMPILER_CONCURRENCY: String(WORKERS),
  })
  await waitForKotlinCompiler(service, WORKERS)
  project.provide('kotlinCompilerUrl', service.url)
  return () => removeKotlinCompilers(service)
}

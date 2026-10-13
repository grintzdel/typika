import type { TemplateFiles } from '@typika/manifest'
import {
  compileCacheKey,
  KotlinCompileMode,
  kotlinCompileRequest,
  makeKotlinProject,
  type KotlinCompilation,
  type KotlinCompilerClient,
  type KotlinExecutor,
} from '@typika/runtime-kotlin'
import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  registeredTemplate,
  STRATEGY_BASE_KOTLIN_REF,
  STRATEGY_KOTLIN_REF,
  STRATEGY_TS_REF,
} from '../__tests__/registered-template.factory.ts'
import type { RegisteredTemplate } from '../check-registry/check-registry.ts'
import { kotlinArtifactRequests } from './kotlin-artifact-requests.ts'

const COMPILED: KotlinCompilation = {
  _tag: 'Compiled',
  artifact: { kind: 'js', code: '', sourceMap: '{}' },
  diagnostics: [],
}

const idleExecutor: KotlinExecutor = { tests: () => Effect.void, program: () => Effect.void }

const sandboxKeysOf = async (template: RegisteredTemplate) => {
  const requested: Array<Promise<string>> = []
  const compiler: KotlinCompilerClient = {
    compile: (mode, files) => {
      requested.push(compileCacheKey(kotlinCompileRequest(mode, files)))
      return Effect.succeed(COMPILED)
    },
  }
  const project = makeKotlinProject(compiler, idleExecutor)
  const files = [...template.files].filter(([path]) => !path.startsWith('exercises/'))
  const testGlobs = template.manifest.tests?.include
  const options = testGlobs === undefined ? {} : { testGlobs }
  await Effect.runPromise(Effect.scoped(project.test(files, { runId: 'sandbox', ...options }, () => {})))
  await Effect.runPromise(Effect.scoped(project.run(files, options, () => {})))
  const [test, run] = await Promise.all(requested)
  return { test, run }
}

let kotlin: RegisteredTemplate
let base: RegisteredTemplate
let ts: RegisteredTemplate

beforeAll(async () => {
  ;[kotlin, base, ts] = await Promise.all([
    registeredTemplate(STRATEGY_KOTLIN_REF),
    registeredTemplate(STRATEGY_BASE_KOTLIN_REF),
    registeredTemplate(STRATEGY_TS_REF),
  ])
})

describe('kotlinArtifactRequests', () => {
  it('asks for a test and a run compilation of each Kotlin template only', async () => {
    const requests = await kotlinArtifactRequests([kotlin, ts, base])

    expect(requests.map(({ template, request }) => [template, request.mode])).toEqual([
      ['strategy-kotlin', KotlinCompileMode.TEST],
      ['strategy-kotlin', KotlinCompileMode.RUN],
      ['strategy-base-kotlin', KotlinCompileMode.TEST],
      ['strategy-base-kotlin', KotlinCompileMode.RUN],
    ])
  })

  it('keys each compilation as the sandbox does for the opened template', async () => {
    const requests = await kotlinArtifactRequests([kotlin])
    const keyOf = (mode: KotlinCompileMode) => requests.find((request) => request.request.mode === mode)?.key

    expect({ test: keyOf(KotlinCompileMode.TEST), run: keyOf(KotlinCompileMode.RUN) }).toEqual(
      await sandboxKeysOf(kotlin)
    )
  })

  it('leaves the exercises and, when running, the tests out of the sources', async () => {
    const requests = await kotlinArtifactRequests([kotlin])
    const pathsOf = (mode: KotlinCompileMode) =>
      requests.find((request) => request.request.mode === mode)?.request.files.map((file) => file.path) ?? []

    expect(pathsOf(KotlinCompileMode.TEST).some((path) => path.startsWith('exercises/'))).toBe(false)
    expect(pathsOf(KotlinCompileMode.TEST)).toContain('src/test/kotlin/checkout/QuoteTest.kt')
    expect(pathsOf(KotlinCompileMode.RUN)).not.toContain('src/test/kotlin/checkout/QuoteTest.kt')
    expect(pathsOf(KotlinCompileMode.RUN)).toContain('src/main/kotlin/Main.kt')
  })

  it('changes the key when a source of the template changes', async () => {
    const edited = await registeredTemplate(
      STRATEGY_KOTLIN_REF,
      (files): TemplateFiles => new Map([...files, ['src/main/kotlin/Main.kt', 'fun main() {}\n']])
    )
    const [before, after] = await Promise.all([kotlinArtifactRequests([kotlin]), kotlinArtifactRequests([edited])])

    expect(after.filter((request) => before.some((other) => other.key === request.key))).toEqual([])
  })
})

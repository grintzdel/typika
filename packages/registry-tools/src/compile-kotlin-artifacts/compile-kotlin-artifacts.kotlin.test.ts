import { providedKotlinCompilerUrl } from '@typika/kotlin-compiler/provided'
import type { TestEvent } from '@typika/runtime-core'
import { makeKotlinCompilerClient, makeKotlinProject, makeMemoryCompileCache } from '@typika/runtime-kotlin'
import { inProcessKotlinExecutor } from '@typika/runtime-kotlin/node'
import * as Effect from 'effect/Effect'
import { describe, expect, it, vi } from 'vitest'

import { registeredTemplate, STRATEGY_KOTLIN_REF } from '../__tests__/registered-template.factory.ts'
import { kotlinArtifactRequests } from '../kotlin-artifact-requests/kotlin-artifact-requests.ts'
import { compileKotlinArtifacts } from './compile-kotlin-artifacts.ts'

describe('compileKotlinArtifacts with the compile service', () => {
  it('compiles artifacts that run the tests of the opened template without calling the service', async () => {
    const template = await registeredTemplate(STRATEGY_KOTLIN_REF)
    const artifacts = await Effect.runPromise(
      compileKotlinArtifacts(
        await kotlinArtifactRequests([template]),
        makeKotlinCompilerClient({ url: providedKotlinCompilerUrl() })
      )
    )
    const cache = makeMemoryCompileCache(Number.MAX_SAFE_INTEGER)
    await Promise.all(artifacts.map(({ key, compilation }) => cache.set(key, compilation)))
    const fetch = vi.fn<typeof globalThis.fetch>()
    const project = makeKotlinProject(
      makeKotlinCompilerClient({ url: 'http://compiler.invalid', cache, fetch }),
      inProcessKotlinExecutor
    )
    const events: Array<TestEvent> = []

    await Effect.runPromise(
      Effect.scoped(
        project.test(
          [...template.files].filter(([path]) => !path.startsWith('exercises/')),
          { runId: 'artifact' },
          (event) => events.push(event)
        )
      )
    )

    expect(artifacts).toHaveLength(2)
    expect(fetch).not.toHaveBeenCalled()
    expect(events.at(-1)).toMatchObject({ _tag: 'RunFinished', status: 'passed', failed: 0 })
  })
})

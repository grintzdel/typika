import { KotlinCompilerUnavailableError } from '@typika/runtime-core'
import {
  KotlinCompileMode,
  kotlinCompileRequest,
  type KotlinCompilation,
  type KotlinCompilerClient,
} from '@typika/runtime-kotlin'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import { describe, expect, it, vi } from 'vitest'

import type { KotlinArtifactRequest } from '../kotlin-artifact-requests/kotlin-artifact-requests.ts'
import { compileKotlinArtifacts } from './compile-kotlin-artifacts.ts'

const SOURCES = [{ path: 'src/main/kotlin/Main.kt', content: 'fun main() {}' }]
const WARNING = { severity: 'warning', message: 'Parameter is never used' } as const

const compiled = (code: string): KotlinCompilation => ({
  _tag: 'Compiled',
  artifact: { kind: 'js', code, sourceMap: '{"version":3}' },
  diagnostics: [WARNING],
})

const requestOf = (key: string, mode: KotlinCompileMode): KotlinArtifactRequest => ({
  template: 'strategy-kotlin',
  key,
  request: kotlinCompileRequest(mode, SOURCES),
})

const compilerAnswering = (answer: (mode: KotlinCompileMode) => ReturnType<KotlinCompilerClient['compile']>) => {
  const compile = vi.fn<KotlinCompilerClient['compile']>((mode) => answer(mode))
  return { compile, compiler: { compile } }
}

const errorOf = <A, E>(exit: Exit.Exit<A, E>) =>
  Exit.isFailure(exit) ? Option.getOrUndefined(Cause.findErrorOption(exit.cause)) : undefined

describe('compileKotlinArtifacts', () => {
  it('keeps each compilation, warnings included, under the key of its request', async () => {
    const { compile, compiler } = compilerAnswering((mode) => Effect.succeed(compiled(`${mode}()`)))

    const artifacts = await Effect.runPromise(
      compileKotlinArtifacts(
        [requestOf('a1', KotlinCompileMode.TEST), requestOf('b2', KotlinCompileMode.RUN)],
        compiler
      )
    )

    expect(artifacts).toEqual([
      { key: 'a1', compilation: compiled('test()') },
      { key: 'b2', compilation: compiled('run()') },
    ])
    expect(compile).toHaveBeenCalledWith(KotlinCompileMode.TEST, SOURCES)
  })

  it('fails, naming the template and mode, when a template does not compile', async () => {
    const diagnostics = [{ severity: 'error', message: 'Unresolved reference: Quote' }] as const
    const { compiler } = compilerAnswering(() => Effect.succeed({ _tag: 'Failed', diagnostics }))

    const exit = await Effect.runPromiseExit(compileKotlinArtifacts([requestOf('a1', KotlinCompileMode.RUN)], compiler))

    expect(errorOf(exit)).toMatchObject({
      _tag: 'KotlinArtifactFailedError',
      template: 'strategy-kotlin',
      mode: 'run',
      diagnostics,
    })
  })

  it('stops at the first compiler error', async () => {
    const { compile, compiler } = compilerAnswering(() =>
      Effect.fail(new KotlinCompilerUnavailableError({ cause: 'HTTP 503' }))
    )

    const exit = await Effect.runPromiseExit(
      compileKotlinArtifacts(
        [requestOf('a1', KotlinCompileMode.TEST), requestOf('b2', KotlinCompileMode.RUN)],
        compiler
      )
    )

    expect(errorOf(exit)).toMatchObject({ _tag: 'KotlinCompilerUnavailableError' })
    expect(compile).toHaveBeenCalledTimes(1)
  })
})

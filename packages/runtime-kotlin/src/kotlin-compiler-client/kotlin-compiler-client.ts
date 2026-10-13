import { KotlinCompilerRateLimitedError, KotlinCompilerUnavailableError, RuntimeLimit } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { compileCacheKey } from '../compile-cache-key/compile-cache-key.ts'
import type { CompileCache } from '../domain/compile-cache.port.ts'
import {
  CompileErrorBodySchema,
  CompileResponseSchema,
  type KotlinCompilation,
  type KotlinCompileRequest,
  type KotlinSourceFile,
} from '../domain/compile-protocol.domain-model.ts'
import type { KotlinCompileMode } from '../domain/constants/kotlin-compile-mode.constant.ts'
import { KotlinProtocol } from '../domain/constants/kotlin-protocol.constant.ts'

export type KotlinCompilerClientOptions = {
  readonly url: string
  readonly cache?: CompileCache
  readonly fetch?: typeof globalThis.fetch
  readonly timeoutMs?: number
}

export type KotlinCompilerError = KotlinCompilerUnavailableError | KotlinCompilerRateLimitedError

export type KotlinCompilerClient = {
  readonly compile: (
    mode: KotlinCompileMode,
    files: ReadonlyArray<KotlinSourceFile>
  ) => Effect.Effect<KotlinCompilation, KotlinCompilerError>
}

const DEFAULT_RETRY_AFTER_SECONDS = 5
const MAX_REQUEST_KIB = RuntimeLimit.KOTLIN_COMPILE_REQUEST_BYTES / 1024
const encoder = new TextEncoder()

const tooLarge: KotlinCompilation = {
  _tag: 'Failed',
  diagnostics: [
    { severity: 'error', message: `The project is too large to compile: over ${MAX_REQUEST_KIB} KiB of sources.` },
  ],
}

const retryAfterSeconds = (header: string | null) => {
  if (header === null) return DEFAULT_RETRY_AFTER_SECONDS
  const seconds = Number(header)
  if (Number.isInteger(seconds) && seconds >= 0) return seconds
  const date = Date.parse(header)
  return Number.isNaN(date) ? DEFAULT_RETRY_AFTER_SECONDS : Math.max(0, Math.ceil((date - Date.now()) / 1000))
}

const decodeResponse = Schema.decodeUnknownEffect(CompileResponseSchema)
const decodeErrorBody = Schema.decodeUnknownOption(CompileErrorBodySchema)

const unavailable = (cause: unknown) => new KotlinCompilerUnavailableError({ cause })

const compilationOf = (response: typeof CompileResponseSchema.Type) =>
  response.ok && response.artifact !== undefined
    ? Effect.succeed<KotlinCompilation>({
        _tag: 'Compiled',
        artifact: response.artifact,
        diagnostics: response.diagnostics,
      })
    : response.ok
      ? Effect.fail(unavailable('The compiler answered ok without an artifact'))
      : Effect.succeed<KotlinCompilation>({ _tag: 'Failed', diagnostics: response.diagnostics })

export const makeKotlinCompilerClient = (options: KotlinCompilerClientOptions): KotlinCompilerClient => {
  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  const timeoutMs = options.timeoutMs ?? RuntimeLimit.KOTLIN_COMPILE_CLIENT_TIMEOUT_MS
  const endpoint = `${options.url.replace(/\/+$/, '')}/compile`

  const post = (request: string) =>
    Effect.tryPromise({
      try: async (signal) => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: request,
          signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
        })
        const body: unknown = await response.json()
        return { status: response.status, retryAfter: response.headers.get('retry-after'), body }
      },
      catch: unavailable,
    })

  return {
    compile: (mode, files) =>
      Effect.gen(function* () {
        const request: KotlinCompileRequest = {
          protocol: KotlinProtocol.VERSION,
          target: KotlinProtocol.TARGET,
          kotlinVersion: KotlinProtocol.KOTLIN_VERSION,
          mode,
          files,
        }
        const body = JSON.stringify(request)
        if (encoder.encode(body).byteLength > RuntimeLimit.KOTLIN_COMPILE_REQUEST_BYTES) return tooLarge

        const cache = options.cache
        const key = cache === undefined ? undefined : yield* Effect.promise(() => compileCacheKey(request))
        if (cache !== undefined && key !== undefined) {
          const cached = yield* Effect.promise(() => cache.get(key))
          if (cached !== undefined) return cached
        }

        const response = yield* post(body)
        if (response.status === 413) return tooLarge
        if (response.status === 429) {
          return yield* new KotlinCompilerRateLimitedError({
            retryAfterSeconds: retryAfterSeconds(response.retryAfter),
          })
        }
        if (response.status !== 200) {
          const error = decodeErrorBody(response.body)
          return yield* unavailable(`HTTP ${response.status}${error._tag === 'Some' ? `: ${error.value.error}` : ''}`)
        }
        const compilation = yield* decodeResponse(response.body).pipe(
          Effect.mapError(unavailable),
          Effect.flatMap(compilationOf)
        )
        if (cache !== undefined && key !== undefined) yield* Effect.promise(() => cache.set(key, compilation))
        return compilation
      }),
  }
}

import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import type { CompileCache } from '../domain/compile-cache.port.ts'
import { KotlinCompilationSchema } from '../domain/compile-protocol.domain-model.ts'

export type PrecompiledCompileCacheOptions = {
  readonly artifactsUrl: string
  readonly cache: CompileCache
  readonly fetch?: typeof globalThis.fetch
}

const decodeCompilation = Schema.decodeUnknownOption(KotlinCompilationSchema)

export const makePrecompiledCompileCache = (options: PrecompiledCompileCacheOptions): CompileCache => {
  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis)

  const artifactOf = async (key: string) => {
    const response = await fetch(new URL(`${key}.json`, options.artifactsUrl)).catch(() => undefined)
    if (response?.ok !== true) return undefined
    const body: unknown = await response.json().catch(() => undefined)
    return Option.getOrUndefined(decodeCompilation(body))
  }

  return {
    get: async (key) => (await options.cache.get(key)) ?? artifactOf(key),
    set: options.cache.set,
  }
}

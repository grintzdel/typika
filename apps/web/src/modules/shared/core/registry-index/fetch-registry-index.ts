import { INDEX_SCHEMA_VERSION, RegistryIndexSchema, type RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

import { RegistryIndexFailure } from '../domain/constants/registry-index-failure.constant.ts'
import { RegistryIndexUnavailableError } from '../domain/errors/registry-index-unavailable.error.ts'

const VersionedSchema = Schema.Struct({ schema: Schema.Number })

const unavailable = (failure: RegistryIndexFailure, reason: string) =>
  new RegistryIndexUnavailableError({ failure, reason })

export const decodeRegistryIndex = (body: unknown): Effect.Effect<RegistryIndex, RegistryIndexUnavailableError> =>
  Effect.gen(function* () {
    const { schema } = yield* Schema.decodeUnknownEffect(VersionedSchema)(body).pipe(
      Effect.mapError((error) => unavailable(RegistryIndexFailure.INVALID, error.message))
    )
    if (Math.trunc(schema) !== INDEX_SCHEMA_VERSION)
      return yield* unavailable(RegistryIndexFailure.UNSUPPORTED, `index schema ${schema} is not supported`)
    return yield* Schema.decodeUnknownEffect(RegistryIndexSchema)(body).pipe(
      Effect.mapError((error) => unavailable(RegistryIndexFailure.INVALID, error.message))
    )
  })

export const fetchRegistryIndex = (
  url: string,
  fetchFn: typeof fetch = globalThis.fetch
): Effect.Effect<RegistryIndex, RegistryIndexUnavailableError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetchFn(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as unknown
    },
    catch: (cause) => unavailable(RegistryIndexFailure.NETWORK, `Cannot load ${url}: ${String(cause)}`),
  }).pipe(Effect.flatMap(decodeRegistryIndex))

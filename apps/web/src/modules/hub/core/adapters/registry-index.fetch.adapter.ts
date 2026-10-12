import type { RegistryIndex } from '@typika/registry-tools/index-schema'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { AppConfig } from '../../../shared/core/ports/app-config.port.ts'
import { fetchRegistryIndex } from '../../../shared/core/registry-index/fetch-registry-index.ts'
import { RegistryIndexPort } from '../ports/registry-index.port.ts'

export const makeRegistryIndexFetch = (
  url: string,
  fetchFn: typeof fetch = globalThis.fetch
): Context.Service.Shape<typeof RegistryIndexPort> => {
  let cached: RegistryIndex | undefined
  const load = fetchRegistryIndex(url, fetchFn).pipe(
    Effect.tap((index) =>
      Effect.sync(() => {
        cached = index
      })
    )
  )
  return { index: Effect.suspend(() => (cached === undefined ? load : Effect.succeed(cached))) }
}

export const RegistryIndexFetchLayer = Layer.effect(
  RegistryIndexPort,
  Effect.map(AppConfig, (config) => makeRegistryIndexFetch(config.registryIndexUrl))
)

import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { decodeRegistryIndex } from '../../../shared/core/registry-index/fetch-registry-index.ts'
import { RegistryIndexPort } from '../ports/registry-index.port.ts'

export const makeRegistryIndexEmbedded = (body: unknown): Context.Service.Shape<typeof RegistryIndexPort> => ({
  index: Effect.cached(decodeRegistryIndex(body)).pipe(Effect.runSync),
})

export const registryIndexEmbeddedLayer = (body: unknown) =>
  Layer.sync(RegistryIndexPort, () => makeRegistryIndexEmbedded(body))

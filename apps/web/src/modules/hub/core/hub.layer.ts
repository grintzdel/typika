import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { SharedLayer } from '../../shared/core/shared.layer.ts'
import { registryIndexEmbeddedLayer } from './adapters/registry-index.embedded.adapter.ts'
import { RegistryIndexFetchLayer } from './adapters/registry-index.fetch.adapter.ts'

// The prerender reads the index built with the app; a static import would put it in the client bundle.
export const HubLayer = import.meta.env.SSR
  ? Layer.unwrap(
      Effect.promise(async () => registryIndexEmbeddedLayer((await import('virtual:typika/registry-index')).default))
    )
  : RegistryIndexFetchLayer.pipe(Layer.provide(SharedLayer))

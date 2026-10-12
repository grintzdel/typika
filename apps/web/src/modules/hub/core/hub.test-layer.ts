import type { RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { RegistryIndexPort } from './ports/registry-index.port.ts'

export const makeHubTestLayer = (index: RegistryIndex) =>
  Layer.succeed(RegistryIndexPort, { index: Effect.succeed(index) })

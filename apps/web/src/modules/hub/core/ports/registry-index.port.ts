import type { RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { RegistryIndexUnavailableError } from '../../../shared/core/domain/errors/registry-index-unavailable.error.ts'

export class RegistryIndexPort extends Context.Service<
  RegistryIndexPort,
  { readonly index: Effect.Effect<RegistryIndex, RegistryIndexUnavailableError> }
>()('@typika/web/RegistryIndexPort') {}

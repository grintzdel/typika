import * as Effect from 'effect/Effect'

import { conceptSectionsOf } from '../../domain/hub.domain-model.ts'
import { RegistryIndexPort } from '../../ports/registry-index.port.ts'

export const listConceptsProgram = Effect.gen(function* () {
  const registry = yield* RegistryIndexPort
  return conceptSectionsOf(yield* registry.index)
})

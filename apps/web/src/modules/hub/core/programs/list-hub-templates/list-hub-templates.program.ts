import * as Effect from 'effect/Effect'

import { listedTemplatesOf } from '../../domain/hub.domain-model.ts'
import { facetOptionsOf } from '../../domain/template-filters.domain-model.ts'
import { RegistryIndexPort } from '../../ports/registry-index.port.ts'

export const listHubTemplatesProgram = Effect.gen(function* () {
  const registry = yield* RegistryIndexPort
  const index = yield* registry.index
  const templates = listedTemplatesOf(index)
  return { templates, facets: facetOptionsOf(templates, index.vocabulary.topics) }
})

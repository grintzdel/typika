import * as Effect from 'effect/Effect'

import { templatePageOf } from '../../domain/hub.domain-model.ts'
import { RegistryIndexPort } from '../../ports/registry-index.port.ts'

export const getTemplatePageProgram = (name: string) =>
  Effect.gen(function* () {
    const registry = yield* RegistryIndexPort
    return templatePageOf(yield* registry.index, name)
  })

import * as Effect from 'effect/Effect'

import { TemplateIndexPort } from '../../ports/template-index.port.ts'

export const listTemplatesProgram = Effect.gen(function* () {
  const index = yield* TemplateIndexPort
  const entries = yield* index.entries
  return entries.map((entry) => entry.name)
})

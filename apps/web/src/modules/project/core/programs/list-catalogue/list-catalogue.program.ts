import * as Effect from 'effect/Effect'

import { TemplateIndexPort } from '../../ports/template-index.port.ts'

export const listCatalogueProgram = Effect.gen(function* () {
  const index = yield* TemplateIndexPort
  const entries = yield* index.entries
  return entries
    .filter((entry) => entry.role === 'template')
    .map(({ name, title, language }) => ({ name, title, language }))
    .toSorted((a, b) => a.title.localeCompare(b.title) || a.name.localeCompare(b.name))
})

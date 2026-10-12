import * as Effect from 'effect/Effect'

import type { TemplateSummary } from '../../domain/project.domain-model.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'

const byTitleThenLanguage = (a: TemplateSummary, b: TemplateSummary) =>
  a.title.localeCompare(b.title) || a.language.localeCompare(b.language)

export const listTemplateSummariesProgram = Effect.gen(function* () {
  const index = yield* TemplateIndexPort
  const entries = yield* index.entries
  return entries
    .filter((entry) => entry.role !== 'base')
    .map(({ name, title, summary, language, level }): TemplateSummary => ({ name, title, summary, language, level }))
    .toSorted(byTitleThenLanguage)
})

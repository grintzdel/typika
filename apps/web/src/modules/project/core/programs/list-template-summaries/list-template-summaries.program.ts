import { MANIFEST_FILE, parseManifest } from '@typika/manifest'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'

import { textOf, type TemplateSummary } from '../../domain/project.domain-model.ts'
import { TemplateSourcePort } from '../../ports/template-source.port.ts'

const byTitleThenLanguage = (a: TemplateSummary, b: TemplateSummary) =>
  a.title.localeCompare(b.title) || a.language.localeCompare(b.language)

export const listTemplateSummariesProgram = Effect.gen(function* () {
  const source = yield* TemplateSourcePort
  const names = yield* source.names
  const manifests = yield* Effect.forEach(names, (name) =>
    source.load(name).pipe(
      Effect.flatMap((files) => parseManifest(textOf(files.get(MANIFEST_FILE) ?? ''))),
      Effect.option
    )
  )
  return Arr.getSomes(manifests)
    .filter((manifest) => manifest.role !== 'base')
    .map((manifest): TemplateSummary => ({
      name: manifest.name,
      title: manifest.title,
      summary: manifest.summary,
      language: manifest.facets.language,
      level: manifest.facets.level,
    }))
    .toSorted(byTitleThenLanguage)
})

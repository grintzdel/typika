import * as Effect from 'effect/Effect'

import { projectPathOf, type ProjectListItem } from '../../domain/project.domain-model.ts'
import { entryNamed } from '../../domain/template-entry.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'

export const listProjectsProgram = Effect.gen(function* () {
  const storage = yield* ProjectStoragePort
  const index = yield* TemplateIndexPort
  const records = yield* storage.list
  const entries = yield* index.entries.pipe(Effect.orElseSucceed(() => []))
  return records.map(({ id, name, origin, updatedAt }): ProjectListItem => {
    const entry = entryNamed(entries, origin.name)
    return {
      id,
      name,
      path: projectPathOf(id),
      templateName: origin.name,
      templateTitle: entry?.title,
      language: entry?.language,
      exercise: origin.kind === 'exercise' ? origin.exercise : undefined,
      updatedAt,
    }
  })
})

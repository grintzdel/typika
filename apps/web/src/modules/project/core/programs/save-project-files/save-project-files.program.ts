import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'

import { modifiedPathsOf, type ProjectFileEdit, type TemplateProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const saveProjectFilesProgram = ({
  project,
  edits,
}: {
  readonly project: TemplateProject
  readonly edits: ReadonlyArray<ProjectFileEdit>
}) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const now = yield* Clock.currentTimeMillis
    const id = yield* Effect.sync(() => crypto.randomUUID())
    const saved = yield* storage.saveTemplateEdits({
      project: {
        id,
        name: project.templateName,
        origin: project.origin,
        createdAt: now,
        updatedAt: now,
      },
      templateFiles: project.templateFiles,
      edits: new Map(edits),
    })
    return modifiedPathsOf(project.templateFiles, saved.files)
  })

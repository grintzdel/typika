import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'

import {
  modifiedPathsOf,
  textFilesOf,
  type ProjectFileEdit,
  type TemplateProject,
} from '../../domain/project.domain-model.ts'
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
    const id = project.projectId ?? (yield* Effect.sync(() => crypto.randomUUID()))
    const saved = yield* storage.saveTemplateEdits({
      project: {
        id,
        name: project.name,
        origin: project.origin,
        ref: project.ref,
        createdAt: now,
        updatedAt: now,
      },
      initialFiles: textFilesOf(project.files),
      edits: new Map(edits),
      match: project.projectId === undefined ? 'origin' : 'id',
    })
    return modifiedPathsOf(project.templateFiles, saved.files)
  })

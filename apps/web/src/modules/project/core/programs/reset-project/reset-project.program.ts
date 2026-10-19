import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import type { TemplateProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const resetProjectProgram = (project: TemplateProject) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const now = yield* Clock.currentTimeMillis
    const { projectId } = project
    if (projectId === undefined) {
      const stored = yield* storage.findByOrigin(project.origin)
      if (Option.isSome(stored)) yield* storage.replaceFiles(stored.value.record.id, project.templateFiles, now)
      return
    }
    yield* storage.saveTemplateEdits({
      project: {
        id: projectId,
        name: project.name,
        origin: project.origin,
        ref: project.ref,
        createdAt: now,
        updatedAt: now,
      },
      initialFiles: project.templateFiles,
      edits: new Map(),
      match: 'id',
    })
    yield* storage.replaceFiles(projectId, project.templateFiles, now)
  })

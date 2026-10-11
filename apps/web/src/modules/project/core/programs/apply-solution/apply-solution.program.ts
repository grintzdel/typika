import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import type { TemplateProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const applySolutionProgram = (project: TemplateProject) =>
  Effect.gen(function* () {
    if (project.exercise === undefined) return
    const storage = yield* ProjectStoragePort
    const now = yield* Clock.currentTimeMillis
    const stored = yield* storage.findByOrigin(project.origin)
    const id = Option.isSome(stored)
      ? stored.value.record.id
      : (yield* storage.saveTemplateEdits({
          project: {
            id: yield* Effect.sync(() => crypto.randomUUID()),
            name: project.templateName,
            origin: project.origin,
            createdAt: now,
            updatedAt: now,
          },
          templateFiles: project.templateFiles,
          edits: new Map(),
        })).record.id
    yield* storage.replaceFiles(id, project.exercise.solutionFiles, now)
  })

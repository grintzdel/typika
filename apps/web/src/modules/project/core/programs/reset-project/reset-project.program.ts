import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import type { TemplateProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const resetProjectProgram = (project: TemplateProject) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const stored = yield* storage.findByOrigin(project.origin)
    if (Option.isNone(stored)) return
    const now = yield* Clock.currentTimeMillis
    yield* storage.replaceFiles(stored.value.record.id, project.templateFiles, now)
  })

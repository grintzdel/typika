import * as Effect from 'effect/Effect'

import { projectPathOf, type RecentProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

const RECENT_PROJECTS = 3

export const listRecentProjectsProgram = Effect.gen(function* () {
  const storage = yield* ProjectStoragePort
  const records = yield* storage.list
  return records.slice(0, RECENT_PROJECTS).map(({ id, origin, updatedAt }): RecentProject => ({
    name: origin.name,
    exercise: origin.kind === 'exercise' ? origin.exercise : undefined,
    path: projectPathOf(id),
    updatedAt,
  }))
})

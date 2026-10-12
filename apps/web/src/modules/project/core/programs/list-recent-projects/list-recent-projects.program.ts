import * as Effect from 'effect/Effect'

import { playPathOf, type RecentProject } from '../../domain/project.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

const RECENT_PROJECTS = 3

export const listRecentProjectsProgram = Effect.gen(function* () {
  const storage = yield* ProjectStoragePort
  const records = yield* storage.listRecent(RECENT_PROJECTS)
  return records.map(({ origin, updatedAt }): RecentProject => ({
    name: origin.name,
    exercise: origin.kind === 'exercise' ? origin.exercise : undefined,
    path: playPathOf(origin),
    updatedAt,
  }))
})

import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error.ts'
import { projectArchiveOf } from '../../domain/project-archive.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const exportStoredProjectProgram = ({
  id,
  includeTypikaFiles,
}: {
  readonly id: string
  readonly includeTypikaFiles: boolean
}) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const stored = yield* storage.findById(id)
    if (Option.isNone(stored)) return yield* new ProjectNotFoundError({ id })
    const { record, files } = stored.value
    return projectArchiveOf({ name: record.name, ref: record.ref, files, includeTypikaFiles })
  })

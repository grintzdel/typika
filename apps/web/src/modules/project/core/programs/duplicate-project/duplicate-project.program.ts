import * as Clock from 'effect/Clock'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { ProjectNotFoundError } from '../../domain/errors/project-not-found.error.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const duplicateProjectProgram = ({ id, name }: { readonly id: string; readonly name: string }) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    const source = yield* storage.findById(id)
    if (Option.isNone(source)) return yield* new ProjectNotFoundError({ id })
    const now = yield* Clock.currentTimeMillis
    const copyId = yield* Effect.sync(() => crypto.randomUUID())
    const copied = yield* storage.duplicate(id, {
      ...source.value.record,
      id: copyId,
      name,
      createdAt: now,
      updatedAt: now,
    })
    if (Option.isNone(copied)) return yield* new ProjectNotFoundError({ id })
    return copyId
  })

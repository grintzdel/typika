import * as Effect from 'effect/Effect'

import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const renameProjectProgram = ({ id, name }: { readonly id: string; readonly name: string }) =>
  Effect.gen(function* () {
    const trimmed = name.trim()
    if (trimmed === '') return
    const storage = yield* ProjectStoragePort
    yield* storage.rename(id, trimmed)
  })

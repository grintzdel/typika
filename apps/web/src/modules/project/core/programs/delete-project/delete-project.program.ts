import * as Effect from 'effect/Effect'

import { ProjectStoragePort } from '../../ports/project-storage.port.ts'

export const deleteProjectProgram = (id: string) =>
  Effect.gen(function* () {
    const storage = yield* ProjectStoragePort
    yield* storage.remove(id)
  })

import type { ProjectPath, RuntimeSession } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

export const deleteProjectFilesProgram = (session: Pick<RuntimeSession, 'fs'>, paths: ReadonlyArray<ProjectPath>) =>
  Effect.forEach(paths, (path) => Effect.ignore(session.fs.deleteFile(path)), { discard: true })

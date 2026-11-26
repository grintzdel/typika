import type { RuntimeSession } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import type { FileWrite } from '../../domain/file-write.domain-model.ts'
import { writeProjectFilesProgram } from '../write-project-files/write-project-files.program.ts'

export const checkProjectProgram = (session: RuntimeSession, writes: ReadonlyArray<FileWrite>) =>
  writeProjectFilesProgram(session, writes).pipe(
    Effect.andThen(session.check === undefined ? Effect.succeed(undefined) : session.check)
  )

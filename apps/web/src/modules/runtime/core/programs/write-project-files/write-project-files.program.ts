import type { RuntimeSession } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'

import type { FileWrite } from '../../domain/file-write.domain-model.ts'

export const writeProjectFilesProgram = (session: RuntimeSession, writes: ReadonlyArray<FileWrite>) =>
  Effect.forEach(writes, ([path, content]) => session.fs.writeFile(path, content), { discard: true })

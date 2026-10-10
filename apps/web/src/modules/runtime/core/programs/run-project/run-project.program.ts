import type { Manifest } from '@typika/manifest'
import type { RuntimeExecutionError, RuntimeFsError, RuntimeSession } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import { EMPTY_CONSOLE, reduceConsole, type ConsoleEvent } from '../../domain/console.domain-model.ts'
import type { FileWrite } from '../../domain/file-write.domain-model.ts'
import { writeProjectFilesProgram } from '../write-project-files/write-project-files.program.ts'

export const runProjectProgram = ({
  session,
  manifest,
  writes,
}: {
  readonly session: RuntimeSession
  readonly manifest: Manifest
  readonly writes: ReadonlyArray<FileWrite>
}): Stream.Stream<typeof EMPTY_CONSOLE, RuntimeFsError> =>
  Stream.unwrap(
    writeProjectFilesProgram(session, writes).pipe(
      Effect.map(() =>
        session.run({ command: manifest.commands?.start ?? manifest.runtime.entry, args: [] }).pipe(
          Stream.map((output): ConsoleEvent => ({ _tag: 'Output', output })),
          Stream.catch((error: RuntimeExecutionError) => Stream.succeed<ConsoleEvent>({ _tag: 'Failed', error })),
          Stream.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Stream.succeed<ConsoleEvent>({ _tag: 'Interrupted' })
              : Stream.failCause(cause)
          ),
          Stream.scan(
            () => EMPTY_CONSOLE,
            (state, event) => reduceConsole(state, event)
          )
        )
      )
    )
  )

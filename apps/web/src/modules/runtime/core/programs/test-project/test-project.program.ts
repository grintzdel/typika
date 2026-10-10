import type { RuntimeExecutionError, RuntimeFsError, RuntimeSession } from '@typika/runtime-core'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import type { FileWrite } from '../../domain/file-write.domain-model.ts'
import { EMPTY_TEST_RUN, reduceTestRun, type TestRunEvent } from '../../domain/test-run.domain-model.ts'
import { writeProjectFilesProgram } from '../write-project-files/write-project-files.program.ts'

export const testProjectProgram = ({
  session,
  writes,
}: {
  readonly session: RuntimeSession
  readonly writes: ReadonlyArray<FileWrite>
}): Stream.Stream<typeof EMPTY_TEST_RUN, RuntimeFsError> =>
  Stream.unwrap(
    writeProjectFilesProgram(session, writes).pipe(
      Effect.map(() =>
        session.test({}).pipe(
          Stream.map((event): TestRunEvent => ({ _tag: 'Event', event })),
          Stream.catch((error: RuntimeExecutionError) => Stream.succeed<TestRunEvent>({ _tag: 'Failed', error })),
          Stream.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Stream.succeed<TestRunEvent>({ _tag: 'Interrupted' })
              : Stream.failCause(cause)
          ),
          Stream.scan(() => EMPTY_TEST_RUN, reduceTestRun)
        )
      )
    )
  )

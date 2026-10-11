import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'
import * as Stream from 'effect/Stream'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { templateProjectAtom } from '../../../project/core/atoms/project.atoms.ts'
import type { FileWrite } from '../domain/file-write.domain-model.ts'
import { runProjectProgram } from '../programs/run-project/run-project.program.ts'
import { startRuntimeSessionProgram } from '../programs/start-runtime-session/start-runtime-session.program.ts'
import { testProjectProgram } from '../programs/test-project/test-project.program.ts'
import { writeProjectFilesProgram } from '../programs/write-project-files/write-project-files.program.ts'

const LATEST = { suspendOnWaiting: true }

export const runtimeSessionAtom = Atom.family((name: string) =>
  appRuntime.atom((get) => Effect.flatMap(get.result(templateProjectAtom(name), LATEST), startRuntimeSessionProgram))
)

export const runProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((writes: ReadonlyArray<FileWrite>, get) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const project = yield* get.result(templateProjectAtom(name), LATEST)
        const session = yield* get.result(runtimeSessionAtom(name), LATEST)
        return runProjectProgram({ session, manifest: project.manifest, writes })
      })
    )
  )
)

export const testProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((writes: ReadonlyArray<FileWrite>, get) =>
    Stream.unwrap(
      Effect.map(get.result(runtimeSessionAtom(name), LATEST), (session) => testProjectProgram({ session, writes }))
    )
  )
)

export const writeProjectFilesAtom = Atom.family((name: string) =>
  appRuntime.fn(
    (writes: ReadonlyArray<FileWrite>, get) =>
      Effect.gen(function* () {
        const { generation } = yield* get.result(templateProjectAtom(name), LATEST)
        const session = yield* get.result(runtimeSessionAtom(name), LATEST)
        const current = yield* get.result(templateProjectAtom(name), LATEST)
        if (current.generation === generation) yield* writeProjectFilesProgram(session, writes)
      }),
    { concurrent: true }
  )
)

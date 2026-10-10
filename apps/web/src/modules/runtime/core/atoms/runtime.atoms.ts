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

export const runtimeSessionAtom = Atom.family((name: string) =>
  appRuntime.atom((get) => Effect.flatMap(get.result(templateProjectAtom(name)), startRuntimeSessionProgram))
)

export const runProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((writes: ReadonlyArray<FileWrite>, get) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const project = yield* get.result(templateProjectAtom(name))
        const session = yield* get.result(runtimeSessionAtom(name))
        return runProjectProgram({ session, manifest: project.manifest, writes })
      })
    )
  )
)

export const testProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((writes: ReadonlyArray<FileWrite>, get) =>
    Stream.unwrap(
      Effect.map(get.result(runtimeSessionAtom(name)), (session) => testProjectProgram({ session, writes }))
    )
  )
)

export const writeProjectFilesAtom = Atom.family((name: string) =>
  appRuntime.fn(
    (writes: ReadonlyArray<FileWrite>, get) =>
      Effect.flatMap(get.result(runtimeSessionAtom(name)), (session) => writeProjectFilesProgram(session, writes)),
    { concurrent: true }
  )
)

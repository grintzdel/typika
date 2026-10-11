import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import type { ProjectFileEdit, TemplateProject } from '../domain/project.domain-model.ts'
import { applySolutionProgram } from '../programs/apply-solution/apply-solution.program.ts'
import { listTemplatesProgram } from '../programs/list-templates/list-templates.program.ts'
import { openBaseProgram } from '../programs/open-base/open-base.program.ts'
import { openTemplateProgram } from '../programs/open-template/open-template.program.ts'
import { resetProjectProgram } from '../programs/reset-project/reset-project.program.ts'
import { saveProjectFilesProgram } from '../programs/save-project-files/save-project-files.program.ts'

export type OpenedProject = TemplateProject & { readonly generation: number }

export const embeddedTemplatesAtom = appRuntime.atom(listTemplatesProgram)

const generationAtom = Atom.family((_name: string) => Atom.make(0))

export const templateProjectAtom = Atom.family((name: string) =>
  appRuntime.atom((get) => {
    const generation = get(generationAtom(name))
    return Effect.map(openTemplateProgram(name), (project): OpenedProject => ({ ...project, generation }))
  })
)

export const baseTemplateAtom = Atom.family((name: string) =>
  appRuntime.atom((get) =>
    Effect.flatMap(get.result(templateProjectAtom(name)), (project) =>
      project.manifest.base === undefined ? Effect.succeed(undefined) : openBaseProgram(project.manifest.base)
    )
  )
)

export const saveProjectFilesAtom = Atom.family((name: string) =>
  appRuntime.fn(
    (edits: ReadonlyArray<ProjectFileEdit>, get) =>
      Effect.flatMap(get.result(templateProjectAtom(name)), (project) => saveProjectFilesProgram({ project, edits })),
    { concurrent: true }
  )
)

export const resetProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((_: void, get) =>
    Effect.gen(function* () {
      const project = yield* get.result(templateProjectAtom(name))
      yield* resetProjectProgram(project)
      get.set(saveProjectFilesAtom(name), Atom.Reset)
      get.set(generationAtom(name), project.generation + 1)
    })
  )
)

export const applySolutionAtom = Atom.family((name: string) =>
  appRuntime.fn((_: void, get) =>
    Effect.gen(function* () {
      const project = yield* get.result(templateProjectAtom(name))
      yield* applySolutionProgram(project)
      get.set(saveProjectFilesAtom(name), Atom.Reset)
      get.set(generationAtom(name), project.generation + 1)
    })
  )
)

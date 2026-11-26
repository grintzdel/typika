import type { ProjectPath } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Atom from 'effect/reactivity/Atom'
import * as Semaphore from 'effect/Semaphore'

import { appRuntime } from '../../../app/core/app.runtime.ts'
import { gitHubStatusAtom } from '../../../github/core/atoms/github.atoms.ts'
import { projectArchiveOf } from '../domain/project-archive.domain-model.ts'
import type { ProjectFileChanges, TemplateProject } from '../domain/project.domain-model.ts'
import { applySolutionProgram } from '../programs/apply-solution/apply-solution.program.ts'
import { copyTemplateProgram, createBlankProjectProgram } from '../programs/create-project/create-project.program.ts'
import { createShareLinkProgram } from '../programs/create-share-link/create-share-link.program.ts'
import { deleteProjectProgram } from '../programs/delete-project/delete-project.program.ts'
import { duplicateProjectProgram } from '../programs/duplicate-project/duplicate-project.program.ts'
import { estimateStorageProgram } from '../programs/estimate-storage/estimate-storage.program.ts'
import { exportStoredProjectProgram } from '../programs/export-project/export-project.program.ts'
import { importFileProgram, importFromUrlProgram } from '../programs/import-project/import-project.program.ts'
import { listCatalogueProgram } from '../programs/list-catalogue/list-catalogue.program.ts'
import { listProjectsProgram } from '../programs/list-projects/list-projects.program.ts'
import { listRecentProjectsProgram } from '../programs/list-recent-projects/list-recent-projects.program.ts'
import { listTemplatesProgram } from '../programs/list-templates/list-templates.program.ts'
import { openBaseProgram } from '../programs/open-base/open-base.program.ts'
import { openTemplateProgram } from '../programs/open-template/open-template.program.ts'
import { pushRepositoryProgram } from '../programs/push-repository/push-repository.program.ts'
import { renameProjectProgram } from '../programs/rename-project/rename-project.program.ts'
import { resetProjectProgram } from '../programs/reset-project/reset-project.program.ts'
import { saveProjectFilesProgram } from '../programs/save-project-files/save-project-files.program.ts'
import { shareGistProgram } from '../programs/share-gist/share-gist.program.ts'

export type OpenedProject = TemplateProject & { readonly generation: number }

export const embeddedTemplatesAtom = appRuntime.atom(listTemplatesProgram)

export const recentProjectsAtom = appRuntime.atom(listRecentProjectsProgram)

export const projectsAtom = appRuntime.atom(listProjectsProgram)

export const storageUsageAtom = appRuntime.atom(estimateStorageProgram)

const refreshingProjects = <A, E, R>(effect: Effect.Effect<A, E, R>, get: Atom.FnContext) =>
  Effect.tap(effect, () =>
    Effect.sync(() => {
      get.refresh(projectsAtom)
      get.refresh(recentProjectsAtom)
      get.refresh(storageUsageAtom)
    })
  )

export const renameProjectAtom = appRuntime.fn((input: { readonly id: string; readonly name: string }, get) =>
  refreshingProjects(renameProjectProgram(input), get)
)

export const duplicateProjectAtom = appRuntime.fn((input: { readonly id: string; readonly name: string }, get) =>
  refreshingProjects(duplicateProjectProgram(input), get)
)

export const deleteProjectAtom = appRuntime.fn((id: string, get) => refreshingProjects(deleteProjectProgram(id), get))

export const catalogueAtom = appRuntime.atom(listCatalogueProgram)

export const createBlankProjectAtom = appRuntime.fn((input: Parameters<typeof createBlankProjectProgram>[0], get) =>
  refreshingProjects(createBlankProjectProgram(input), get)
)

export const copyTemplateAtom = appRuntime.fn((input: Parameters<typeof copyTemplateProgram>[0], get) =>
  refreshingProjects(copyTemplateProgram(input), get)
)

export const importFromUrlAtom = appRuntime.fn((url: string, get) => refreshingProjects(importFromUrlProgram(url), get))

export const importFileAtom = appRuntime.fn((input: Parameters<typeof importFileProgram>[0], get) =>
  refreshingProjects(importFileProgram(input), get)
)

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

export const savedModifiedPathsAtom = Atom.family((_name: string) =>
  Atom.make<ReadonlyArray<ProjectPath> | undefined>(undefined)
)

export const saveProjectFilesAtom = Atom.family((name: string) => {
  const inOrder = Semaphore.makeUnsafe(1)
  return appRuntime.fn(
    (changes: ProjectFileChanges, get) =>
      Effect.flatMap(get.result(templateProjectAtom(name)), (project) =>
        saveProjectFilesProgram({ project, ...changes })
      ).pipe(
        Effect.tap((paths) => Effect.sync(() => get.set(savedModifiedPathsAtom(name), paths))),
        Semaphore.withPermits(inOrder, 1)
      ),
    { concurrent: true }
  )
})

export const resetProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((_: void, get) =>
    Effect.gen(function* () {
      const project = yield* get.result(templateProjectAtom(name))
      yield* resetProjectProgram(project)
      get.set(saveProjectFilesAtom(name), Atom.Reset)
      get.set(savedModifiedPathsAtom(name), undefined)
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
      get.set(savedModifiedPathsAtom(name), undefined)
      get.set(generationAtom(name), project.generation + 1)
    })
  )
)

export const createShareLinkAtom = Atom.family((name: string) =>
  appRuntime.fn((input: { readonly files: ReadonlyMap<string, string>; readonly origin: string }, get) =>
    Effect.flatMap(get.result(templateProjectAtom(name)), (project) => createShareLinkProgram({ project, ...input }))
  )
)

export const shareGistAtom = Atom.family((name: string) =>
  appRuntime.fn(
    (
      input: { readonly files: ReadonlyMap<string, string>; readonly isPublic: boolean; readonly appOrigin: string },
      get
    ) =>
      Effect.flatMap(get.result(templateProjectAtom(name)), (project) => shareGistProgram({ project, ...input })).pipe(
        Effect.tapError(() => Effect.sync(() => get.refresh(gitHubStatusAtom)))
      )
  )
)

export const pushRepositoryAtom = Atom.family((name: string) =>
  appRuntime.fn(
    (
      input: {
        readonly files: ReadonlyMap<string, string>
        readonly name: string
        readonly description: string
        readonly includeTypikaFiles: boolean
        readonly appOrigin: string
      },
      get
    ) =>
      Effect.flatMap(get.result(templateProjectAtom(name)), (project) =>
        pushRepositoryProgram({ project, ...input })
      ).pipe(Effect.tapError(() => Effect.sync(() => get.refresh(gitHubStatusAtom))))
  )
)

export const exportProjectAtom = Atom.family((name: string) =>
  appRuntime.fn((input: { readonly files: ReadonlyMap<string, string>; readonly includeTypikaFiles: boolean }, get) =>
    Effect.map(get.result(templateProjectAtom(name)), (project) =>
      projectArchiveOf({ name: project.name, ref: project.ref, ...input })
    )
  )
)

export const exportStoredProjectAtom = appRuntime.fn(
  (input: { readonly id: string; readonly includeTypikaFiles: boolean }) => exportStoredProjectProgram(input)
)

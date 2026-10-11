import type { TemplateFiles } from '@typika/manifest'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import { ProjectStorageError } from './domain/errors/project-storage.error.ts'
import { ProjectTemplateNotFoundError } from './domain/errors/project-template-not-found.error.ts'
import { sameOrigin, type ProjectOrigin, type StoredProject } from './domain/project.domain-model.ts'
import { ProjectStoragePort } from './ports/project-storage.port.ts'
import { TemplateSourcePort } from './ports/template-source.port.ts'

export type ProjectStorage = Context.Service.Shape<typeof ProjectStoragePort>

export type InMemoryProjectStorage = ProjectStorage & { readonly projects: ReadonlyMap<string, StoredProject> }

export const makeProjectStorageInMemory = (initial: ReadonlyArray<StoredProject> = []): InMemoryProjectStorage => {
  const projects = new Map(initial.map((project) => [project.record.id, project]))

  const latest = (origin: ProjectOrigin) =>
    [...projects.values()]
      .filter((project) => sameOrigin(project.record.origin, origin))
      .toSorted((a, b) => b.record.updatedAt - a.record.updatedAt)[0]

  const storage: ProjectStorage = {
    findByOrigin: (origin) => Effect.sync(() => Option.fromNullishOr(latest(origin))),
    saveTemplateEdits: ({ project, templateFiles, edits }) =>
      Effect.sync(() => {
        const existing = latest(project.origin)
        const saved = {
          record: existing === undefined ? project : { ...existing.record, updatedAt: project.updatedAt },
          files: new Map([...(existing?.files ?? templateFiles), ...edits]),
        }
        projects.set(saved.record.id, saved)
        return saved
      }),
    replaceFiles: (projectId, files, updatedAt) =>
      Effect.sync(() => {
        const existing = projects.get(projectId)
        if (existing !== undefined)
          projects.set(projectId, { record: { ...existing.record, updatedAt }, files: new Map(files) })
      }),
  }

  return { ...storage, projects }
}

const quotaExceeded = () => Effect.fail(new ProjectStorageError({ cause: new Error('QuotaExceededError') }))

export const failingProjectStorage: ProjectStorage = {
  findByOrigin: quotaExceeded,
  saveTemplateEdits: quotaExceeded,
  replaceFiles: quotaExceeded,
}

export const makeProjectTestLayer = (
  templates: Readonly<Record<string, TemplateFiles>>,
  storage: ProjectStorage = makeProjectStorageInMemory()
) =>
  Layer.mergeAll(
    Layer.succeed(TemplateSourcePort, {
      load: (name) => {
        const files = templates[name]
        return files === undefined ? Effect.fail(new ProjectTemplateNotFoundError({ name })) : Effect.succeed(files)
      },
      names: Effect.succeed(Object.keys(templates).toSorted()),
      resolveRef: (ref) => {
        const name = ref.split('/').slice(2).join('-')
        return name in templates ? Effect.succeed(name) : Effect.fail(new ProjectTemplateNotFoundError({ name: ref }))
      },
    }),
    Layer.succeed(ProjectStoragePort, storage)
  )

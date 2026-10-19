import { MANIFEST_FILE, parseManifest, type TemplateFiles } from '@typika/manifest'
import * as Arr from 'effect/Array'
import type * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import { ProjectFilesUnavailableError } from './domain/errors/project-files-unavailable.error.ts'
import { ProjectStorageError } from './domain/errors/project-storage.error.ts'
import { sameOrigin, textOf, type ProjectOrigin, type StoredProject } from './domain/project.domain-model.ts'
import { entryOfManifest } from './domain/template-entry.domain-model.ts'
import { ProjectStoragePort } from './ports/project-storage.port.ts'
import { StorageQuotaPort } from './ports/storage-quota.port.ts'
import { TemplateFilesPort } from './ports/template-files.port.ts'
import { TemplateIndexPort } from './ports/template-index.port.ts'

export type ProjectStorage = Context.Service.Shape<typeof ProjectStoragePort>

export type InMemoryProjectStorage = ProjectStorage & { readonly projects: ReadonlyMap<string, StoredProject> }

export const makeProjectStorageInMemory = (initial: ReadonlyArray<StoredProject> = []): InMemoryProjectStorage => {
  const projects = new Map(initial.map((project) => [project.record.id, project]))

  const latest = (origin: ProjectOrigin) =>
    [...projects.values()]
      .filter((project) => sameOrigin(project.record.origin, origin))
      .toSorted((a, b) => b.record.updatedAt - a.record.updatedAt)[0]

  const storage: ProjectStorage = {
    list: Effect.sync(() =>
      [...projects.values()].map((project) => project.record).toSorted((a, b) => b.updatedAt - a.updatedAt)
    ),
    findById: (id) => Effect.sync(() => Option.fromNullishOr(projects.get(id))),
    findByOrigin: (origin) => Effect.sync(() => Option.fromNullishOr(latest(origin))),
    saveTemplateEdits: ({ project, initialFiles, edits, match = 'origin' }) =>
      Effect.sync(() => {
        const existing = match === 'id' ? projects.get(project.id) : latest(project.origin)
        const saved = {
          record: existing === undefined ? project : { ...existing.record, updatedAt: project.updatedAt },
          files: new Map([...(existing?.files ?? initialFiles), ...edits]),
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
    duplicate: (sourceId, copy) =>
      Effect.sync(() => {
        const source = projects.get(sourceId)
        if (source === undefined) return Option.none()
        const duplicated = { record: copy, files: new Map(source.files) }
        projects.set(copy.id, duplicated)
        return Option.some(duplicated)
      }),
    rename: (id, name) =>
      Effect.sync(() => {
        const existing = projects.get(id)
        if (existing !== undefined) projects.set(id, { ...existing, record: { ...existing.record, name } })
      }),
    remove: (id) =>
      Effect.sync(() => {
        projects.delete(id)
      }),
  }

  return { ...storage, projects }
}

const quotaExceeded = () => Effect.fail(new ProjectStorageError({ cause: new Error('QuotaExceededError') }))

export const failingProjectStorage: ProjectStorage = {
  list: quotaExceeded(),
  findById: quotaExceeded,
  findByOrigin: quotaExceeded,
  saveTemplateEdits: quotaExceeded,
  replaceFiles: quotaExceeded,
  duplicate: quotaExceeded,
  rename: quotaExceeded,
  remove: quotaExceeded,
}

export const testRefOf = (name: string, commit = '0123456789ab') => {
  const cut = name.lastIndexOf('-')
  return `github:typika/templates/${name.slice(0, cut)}/${name.slice(cut + 1)}@${commit}`
}

const pathOfRef = (ref: string) => ref.replace(/@.*$/, '')

export const makeProjectTestLayer = (
  templates: Readonly<Record<string, TemplateFiles>>,
  storage: ProjectStorage = makeProjectStorageInMemory()
) => {
  const byPath = new Map(Object.entries(templates).map(([name, files]) => [pathOfRef(testRefOf(name)), files]))
  return Layer.mergeAll(
    Layer.succeed(TemplateIndexPort, {
      entries: Effect.forEach(Object.entries(templates), ([name, files]) =>
        parseManifest(textOf(files.get(MANIFEST_FILE) ?? '')).pipe(
          Effect.map((manifest) => entryOfManifest(manifest, testRefOf(name))),
          Effect.option
        )
      ).pipe(Effect.map(Arr.getSomes)),
    }),
    Layer.succeed(TemplateFilesPort, {
      load: (ref) => {
        const files = byPath.get(pathOfRef(ref))
        return files === undefined
          ? Effect.fail(new ProjectFilesUnavailableError({ ref, reason: 'missing' }))
          : Effect.succeed(files)
      },
    }),
    Layer.succeed(ProjectStoragePort, storage),
    Layer.succeed(StorageQuotaPort, { estimate: Effect.succeed(Option.none()) })
  )
}

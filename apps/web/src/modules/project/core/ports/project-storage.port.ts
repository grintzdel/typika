import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'

import type { ProjectStorageError } from '../domain/errors/project-storage.error.ts'
import type { ProjectFiles, ProjectOrigin, ProjectRecord, StoredProject } from '../domain/project.domain-model.ts'

export type SaveTemplateEdits = {
  readonly project: ProjectRecord
  readonly initialFiles: ProjectFiles
  readonly edits: ProjectFiles
  readonly match?: 'origin' | 'id'
}

export class ProjectStoragePort extends Context.Service<
  ProjectStoragePort,
  {
    readonly list: Effect.Effect<ReadonlyArray<ProjectRecord>, ProjectStorageError>
    readonly findById: (id: string) => Effect.Effect<Option.Option<StoredProject>, ProjectStorageError>
    readonly findByOrigin: (origin: ProjectOrigin) => Effect.Effect<Option.Option<StoredProject>, ProjectStorageError>
    // Creates `project` from `initialFiles` when no project matches it yet, atomically with the edits. `match`
    // defaults to the latest project of the same origin.
    readonly saveTemplateEdits: (input: SaveTemplateEdits) => Effect.Effect<StoredProject, ProjectStorageError>
    readonly replaceFiles: (
      projectId: string,
      files: ProjectFiles,
      updatedAt: number
    ) => Effect.Effect<void, ProjectStorageError>
    readonly duplicate: (
      sourceId: string,
      copy: ProjectRecord
    ) => Effect.Effect<Option.Option<StoredProject>, ProjectStorageError>
    readonly rename: (id: string, name: string) => Effect.Effect<void, ProjectStorageError>
    readonly remove: (id: string) => Effect.Effect<void, ProjectStorageError>
  }
>()('@typika/web/ProjectStoragePort') {}

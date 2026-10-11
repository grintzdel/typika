import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'

import type { ProjectStorageError } from '../domain/errors/project-storage.error.ts'
import type { ProjectFiles, ProjectOrigin, ProjectRecord, StoredProject } from '../domain/project.domain-model.ts'

export type SaveTemplateEdits = {
  readonly project: ProjectRecord
  readonly templateFiles: ProjectFiles
  readonly edits: ProjectFiles
}

export class ProjectStoragePort extends Context.Service<
  ProjectStoragePort,
  {
    readonly findByOrigin: (origin: ProjectOrigin) => Effect.Effect<Option.Option<StoredProject>, ProjectStorageError>
    // Creates `project` from `templateFiles` when its origin has none yet, atomically with the edits.
    readonly saveTemplateEdits: (input: SaveTemplateEdits) => Effect.Effect<StoredProject, ProjectStorageError>
    readonly replaceFiles: (
      projectId: string,
      files: ProjectFiles,
      updatedAt: number
    ) => Effect.Effect<void, ProjectStorageError>
  }
>()('@typika/web/ProjectStoragePort') {}

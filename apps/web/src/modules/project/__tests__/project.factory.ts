import { ProjectPathSchema, type ProjectPath } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

import type { ProjectFiles, ProjectRecord } from '../core/domain/project.domain-model.ts'

export const projectPath = Schema.decodeUnknownSync(ProjectPathSchema)

export const projectFiles = (entries: Readonly<Record<string, string>>): ProjectFiles =>
  new Map<ProjectPath, string>(Object.entries(entries).map(([path, content]) => [projectPath(path), content]))

let counter = 0

export const projectRecord = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => {
  counter++
  return {
    id: `project-${counter}`,
    name: 'sample-ts',
    origin: { kind: 'template', name: 'sample-ts' },
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  }
}

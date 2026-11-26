import { ProjectPathSchema, type ProjectPath } from '@typika/runtime-core'
import * as Schema from 'effect/Schema'

import { blankProjectFiles } from '../core/domain/personal-project.domain-model.ts'
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

export const personalProject = (edits: Readonly<Record<string, string>> = {}) => {
  const baseline = blankProjectFiles({ name: 'My sandbox', language: 'typescript' })
  return {
    record: projectRecord({
      name: 'My sandbox',
      origin: { kind: 'personal', name: 'my-sandbox', language: 'typescript' },
      baseline: Object.fromEntries(baseline),
    }),
    files: new Map([...baseline, ...projectFiles(edits)]),
  }
}

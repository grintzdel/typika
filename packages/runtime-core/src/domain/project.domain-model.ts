import { isRelativePath, type Manifest } from '@typika/manifest'
import * as Schema from 'effect/Schema'

export const ProjectPathSchema = Schema.String.pipe(
  Schema.check(
    Schema.makeFilter(isRelativePath, { expected: 'a POSIX path relative to the project root, without ".."' })
  ),
  Schema.brand('ProjectPath')
)

export type ProjectPath = typeof ProjectPathSchema.Type

export type FileContent = string | Uint8Array

export interface ProjectSnapshot {
  readonly files: ReadonlyMap<ProjectPath, FileContent>
  readonly manifest: Manifest
}

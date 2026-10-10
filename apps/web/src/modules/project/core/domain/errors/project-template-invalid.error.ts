import type { ManifestIssue } from '@typika/manifest'
import * as Data from 'effect/Data'

export class ProjectTemplateInvalidError extends Data.TaggedError('ProjectTemplateInvalidError')<{
  readonly name: string
  readonly issues: ReadonlyArray<ManifestIssue>
}> {}

import * as Data from 'effect/Data'

import type { ManifestIssue } from '../manifest-issue.domain-model.ts'

export class ManifestInvalidError extends Data.TaggedError('ManifestInvalidError')<{
  readonly issues: ReadonlyArray<ManifestIssue>
}> {}

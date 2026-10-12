import * as Data from 'effect/Data'

import type { ProjectLoadFailure } from '../constants/project-load-failure.constant.ts'

export class ProjectIndexUnavailableError extends Data.TaggedError('ProjectIndexUnavailableError')<{
  readonly failure: ProjectLoadFailure
  readonly reason: string
}> {}

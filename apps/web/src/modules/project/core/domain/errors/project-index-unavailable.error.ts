import * as Data from 'effect/Data'

import type { RegistryIndexFailure } from '../../../../shared/core/domain/constants/registry-index-failure.constant.ts'

export class ProjectIndexUnavailableError extends Data.TaggedError('ProjectIndexUnavailableError')<{
  readonly failure: RegistryIndexFailure
  readonly reason: string
}> {}

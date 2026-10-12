import * as Data from 'effect/Data'

import type { RegistryIndexFailure } from '../constants/registry-index-failure.constant.ts'

export class RegistryIndexUnavailableError extends Data.TaggedError('RegistryIndexUnavailableError')<{
  readonly failure: RegistryIndexFailure
  readonly reason: string
}> {}

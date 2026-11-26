import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { storageUsageOf } from '../../domain/storage-usage.domain-model.ts'
import { ProjectStoragePort } from '../../ports/project-storage.port.ts'
import { StorageQuotaPort } from '../../ports/storage-quota.port.ts'

export const estimateStorageProgram = Effect.gen(function* () {
  const quota = yield* StorageQuotaPort
  const storage = yield* ProjectStoragePort
  const estimate = yield* quota.estimate
  if (Option.isNone(estimate)) return undefined
  const projectsSize = yield* Effect.option(storage.byteSize)
  return Option.isNone(projectsSize) ? undefined : storageUsageOf(projectsSize.value, estimate.value)
})

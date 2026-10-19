import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { storageUsageOf } from '../../domain/storage-usage.domain-model.ts'
import { StorageQuotaPort } from '../../ports/storage-quota.port.ts'

export const estimateStorageProgram = Effect.gen(function* () {
  const quota = yield* StorageQuotaPort
  return Option.getOrUndefined(
    Option.flatMap(yield* quota.estimate, (estimate) => Option.fromNullishOr(storageUsageOf(estimate)))
  )
})

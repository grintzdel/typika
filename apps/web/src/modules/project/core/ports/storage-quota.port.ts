import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'

import type { StorageEstimate } from '../domain/storage-usage.domain-model.ts'

export class StorageQuotaPort extends Context.Service<
  StorageQuotaPort,
  { readonly estimate: Effect.Effect<Option.Option<StorageEstimate>> }
>()('@typika/web/StorageQuotaPort') {}

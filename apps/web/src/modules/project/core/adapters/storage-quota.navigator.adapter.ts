import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import { StorageQuotaPort } from '../ports/storage-quota.port.ts'

export const StorageQuotaNavigatorLayer = Layer.succeed(StorageQuotaPort, {
  estimate: Effect.promise(async () => {
    if (!('storage' in navigator)) return Option.none()
    const { usage, quota } = await navigator.storage.estimate().catch(() => ({ usage: undefined, quota: undefined }))
    return usage === undefined || quota === undefined ? Option.none() : Option.some({ usage, quota })
  }),
})

import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { describe, expect, it } from 'vitest'

import { StorageQuotaPort } from '../../ports/storage-quota.port.ts'
import { makeProjectTestLayer } from '../../project.test-layer.ts'
import { estimateStorageProgram } from './estimate-storage.program.ts'

const estimate = (value: Option.Option<{ readonly usage: number; readonly quota: number }>) =>
  Effect.runPromise(
    estimateStorageProgram.pipe(
      Effect.provide(
        Layer.mergeAll(makeProjectTestLayer({}), Layer.succeed(StorageQuotaPort, { estimate: Effect.succeed(value) }))
      )
    )
  )

describe('estimateStorageProgram', () => {
  it('reports the storage used out of the quota', async () => {
    expect(await estimate(Option.some({ usage: 1_000, quota: 10_000 }))).toEqual({
      usage: 1_000,
      quota: 10_000,
      isNearlyFull: false,
    })
  })

  it('warns from 80 % of the quota', async () => {
    expect(await estimate(Option.some({ usage: 8_000, quota: 10_000 }))).toMatchObject({ isNearlyFull: true })
  })

  it('reports nothing when the browser gives no estimate', async () => {
    expect(await estimate(Option.none())).toBeUndefined()
    expect(await estimate(Option.some({ usage: 0, quota: 0 }))).toBeUndefined()
  })
})

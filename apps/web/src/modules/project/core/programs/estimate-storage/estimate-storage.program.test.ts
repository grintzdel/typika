import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { StorageQuotaPort } from '../../ports/storage-quota.port.ts'
import {
  failingProjectStorage,
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  type ProjectStorage,
} from '../../project.test-layer.ts'
import { estimateStorageProgram } from './estimate-storage.program.ts'

const storedProjects = () =>
  makeProjectStorageInMemory([
    { record: projectRecord(), files: projectFiles({ 'src/a.ts': 'abc' }) },
    { record: projectRecord(), files: projectFiles({ 'src/b.ts': 'é' }) },
  ])

const estimate = (
  value: Option.Option<{ readonly usage: number; readonly quota: number }>,
  storage: ProjectStorage = storedProjects()
) =>
  Effect.runPromise(
    estimateStorageProgram.pipe(
      Effect.provide(
        Layer.mergeAll(
          makeProjectTestLayer({}, storage),
          Layer.succeed(StorageQuotaPort, { estimate: Effect.succeed(value) })
        )
      )
    )
  )

describe('estimateStorageProgram', () => {
  it('reports the bytes of the stored projects out of the browser quota', async () => {
    expect(await estimate(Option.some({ usage: 1_000, quota: 10_000 }))).toEqual({
      usage: 5,
      quota: 10_000,
      isNearlyFull: false,
    })
  })

  it('warns once the browser has used 80 % of its quota', async () => {
    expect(await estimate(Option.some({ usage: 8_000, quota: 10_000 }))).toMatchObject({
      usage: 5,
      isNearlyFull: true,
    })
  })

  it('reports nothing when the browser gives no estimate', async () => {
    expect(await estimate(Option.none())).toBeUndefined()
    expect(await estimate(Option.some({ usage: 0, quota: 0 }))).toBeUndefined()
  })

  it('reports nothing when the projects cannot be read', async () => {
    expect(await estimate(Option.some({ usage: 1_000, quota: 10_000 }), failingProjectStorage)).toBeUndefined()
  })
})

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer, testRefOf } from '../../project.test-layer.ts'
import { exportStoredProjectProgram } from './export-project.program.ts'

const entriesOf = (bytes: Uint8Array) =>
  Object.fromEntries(Object.entries(unzipSync(bytes)).map(([path, content]) => [path, strFromU8(content)]))

describe('exportStoredProjectProgram', () => {
  it('zips a stored project under its name', async () => {
    const record = projectRecord({ name: 'My pricing', ref: testRefOf('sample-ts') })
    const storage = makeProjectStorageInMemory([
      { record, files: projectFiles({ 'typika.toml': 'schema = 1\n', 'src/main.ts': 'mine' }) },
    ])

    const archive = await Effect.runPromise(
      exportStoredProjectProgram({ id: record.id, includeTypikaFiles: false }).pipe(
        Effect.provide(makeProjectTestLayer({}, storage))
      )
    )

    expect(archive.fileName).toBe('My pricing.zip')
    expect(entriesOf(archive.bytes)).toEqual({ 'src/main.ts': 'mine' })
  })

  it('fails for a project that no longer exists', async () => {
    const exit = await Effect.runPromiseExit(
      exportStoredProjectProgram({ id: 'missing', includeTypikaFiles: true }).pipe(
        Effect.provide(makeProjectTestLayer({}))
      )
    )

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectNotFoundError', id: 'missing' },
    })
  })
})

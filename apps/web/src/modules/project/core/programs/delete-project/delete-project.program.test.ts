import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { deleteProjectProgram } from './delete-project.program.ts'

describe('deleteProjectProgram', () => {
  it('deletes only the given project', async () => {
    const deleted = { record: projectRecord(), files: projectFiles({}) }
    const kept = { record: projectRecord(), files: projectFiles({}) }
    const storage = makeProjectStorageInMemory([deleted, kept])

    await Effect.runPromise(
      deleteProjectProgram(deleted.record.id).pipe(Effect.provide(makeProjectTestLayer({}, storage)))
    )

    expect([...storage.projects.keys()]).toEqual([kept.record.id])
  })
})

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectPath, projectRecord } from '../../../__tests__/project.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { duplicateProjectProgram } from './duplicate-project.program.ts'

describe('duplicateProjectProgram', () => {
  it('copies a project and its files under a new id and name', async () => {
    const source = {
      record: projectRecord({ ref: 'github:typika/templates/sample/ts@0123456789ab' }),
      files: projectFiles({ 'src/main.ts': 'mine' }),
    }
    const storage = makeProjectStorageInMemory([source])

    const id = await Effect.runPromise(
      duplicateProjectProgram({ id: source.record.id, name: 'sample-ts (copy)' }).pipe(
        Effect.provide(makeProjectTestLayer({}, storage))
      )
    )

    const copy = storage.projects.get(id)
    expect(id).not.toBe(source.record.id)
    expect(copy?.record).toMatchObject({
      name: 'sample-ts (copy)',
      origin: source.record.origin,
      ref: source.record.ref,
    })
    expect(copy?.files.get(projectPath('src/main.ts'))).toBe('mine')
  })

  it('fails for a project that no longer exists', async () => {
    const exit = await Effect.runPromiseExit(
      duplicateProjectProgram({ id: 'missing', name: 'copy' }).pipe(Effect.provide(makeProjectTestLayer({})))
    )

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectNotFoundError', id: 'missing' },
    })
  })
})

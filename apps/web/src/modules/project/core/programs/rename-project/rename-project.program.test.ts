import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { renameProjectProgram } from './rename-project.program.ts'

const rename = async (name: string) => {
  const record = projectRecord({ name: 'sample-ts' })
  const storage = makeProjectStorageInMemory([{ record, files: projectFiles({}) }])
  await Effect.runPromise(
    renameProjectProgram({ id: record.id, name }).pipe(Effect.provide(makeProjectTestLayer({}, storage)))
  )
  return storage.projects.get(record.id)?.record.name
}

describe('renameProjectProgram', () => {
  it('renames a project with the name trimmed', async () => {
    expect(await rename('  My pricing ')).toBe('My pricing')
  })

  it('keeps the name when the new one is blank', async () => {
    expect(await rename('   ')).toBe('sample-ts')
  })
})

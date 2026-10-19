import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { listRecentProjectsProgram } from './list-recent-projects.program.ts'

const stored = (name: string, updatedAt: number, exercise?: string) => ({
  record: projectRecord({
    name,
    origin: exercise === undefined ? { kind: 'template', name } : { kind: 'exercise', name, exercise },
    updatedAt,
  }),
  files: projectFiles({}),
})

describe('listRecentProjectsProgram', () => {
  it('lists the three latest projects with the path that reopens each of them', async () => {
    const projects = [stored('a-ts', 1), stored('b-ts', 4, 'fix-it'), stored('c-ts', 3), stored('d-ts', 2)]
    const storage = makeProjectStorageInMemory(projects)
    const pathOf = (index: number) => `/p/${projects[index]?.record.id}`

    const recent = await Effect.runPromise(
      listRecentProjectsProgram.pipe(Effect.provide(makeProjectTestLayer({}, storage)))
    )

    expect(recent).toEqual([
      { name: 'b-ts', exercise: 'fix-it', path: pathOf(1), updatedAt: 4 },
      { name: 'c-ts', exercise: undefined, path: pathOf(2), updatedAt: 3 },
      { name: 'd-ts', exercise: undefined, path: pathOf(3), updatedAt: 2 },
    ])
  })
})

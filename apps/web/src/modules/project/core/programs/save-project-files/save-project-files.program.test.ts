import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectPath } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import {
  failingProjectStorage,
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  testRefOf,
  type ProjectStorage,
} from '../../project.test-layer.ts'
import { openTemplateProgram } from '../open-template/open-template.program.ts'
import { saveProjectFilesProgram } from './save-project-files.program.ts'

const TEMPLATES = { 'sample-ts': templateFiles() }

const save = (
  edits: ReadonlyArray<readonly [string, string]>,
  storage: ProjectStorage = makeProjectStorageInMemory()
) =>
  Effect.runPromiseExit(
    openTemplateProgram('sample-ts').pipe(
      Effect.flatMap((project) =>
        saveProjectFilesProgram({
          project,
          edits: edits.map(([path, content]) => [projectPath(path), content] as const),
        })
      ),
      Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
    )
  )

describe('saveProjectFilesProgram', () => {
  it('records the pinned ref the project was created from', async () => {
    const storage = makeProjectStorageInMemory()

    await save([['src/main.ts', 'edited']], storage)

    expect([...storage.projects.values()][0]?.record.ref).toBe(testRefOf('sample-ts'))
  })

  it('creates a local project of the template on the first edit', async () => {
    const storage = makeProjectStorageInMemory()

    await save([['src/main.ts', 'edited']], storage)

    const [project] = storage.projects.values()
    expect(project?.record).toMatchObject({ name: 'sample-ts', origin: { kind: 'template', name: 'sample-ts' } })
    expect(project?.files.get(projectPath('src/main.ts'))).toBe('edited')
    expect(project?.files.get(projectPath('README.md'))).toBe('# Sample\n')
  })

  it('returns the files that differ from the template', async () => {
    const exit = await save([
      ['src/main.ts', 'edited'],
      ['README.md', '# Sample\n'],
    ])

    expect(Exit.isSuccess(exit) && exit.value).toEqual(['src/main.ts'])
  })

  it('fails with a storage error when the edits cannot be written', async () => {
    const exit = await save([['src/main.ts', 'edited']], failingProjectStorage)

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({ error: { _tag: 'ProjectStorageError' } })
  })
})

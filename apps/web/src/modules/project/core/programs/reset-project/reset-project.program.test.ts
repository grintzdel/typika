import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectPath, projectRecord } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { storedProjectKeyOf } from '../../domain/project.domain-model.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { openTemplateProgram } from '../open-template/open-template.program.ts'
import { saveProjectFilesProgram } from '../save-project-files/save-project-files.program.ts'
import { resetProjectProgram } from './reset-project.program.ts'

const TEMPLATES = { 'sample-ts': templateFiles() }

const reopenAfter = (edits: ReadonlyArray<readonly [string, string]>, storage = makeProjectStorageInMemory()) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const project = yield* openTemplateProgram('sample-ts')
      if (edits.length > 0)
        yield* saveProjectFilesProgram({
          project,
          edits: edits.map(([path, content]) => [projectPath(path), content] as const),
        })
      yield* resetProjectProgram(project)
      return yield* openTemplateProgram('sample-ts')
    }).pipe(Effect.provide(makeProjectTestLayer(TEMPLATES, storage)))
  )

describe('resetProjectProgram', () => {
  it('restores the template files of the project', async () => {
    const reopened = await reopenAfter([['src/main.ts', 'edited']])

    expect(reopened.files.get(projectPath('src/main.ts'))).toBe("console.log('hello')\n")
    expect(reopened.modifiedPaths).toEqual([])
  })

  it('does nothing when the template was never edited', async () => {
    const storage = makeProjectStorageInMemory()

    await reopenAfter([], storage)

    expect(storage.projects.size).toBe(0)
  })

  it('resets only the project opened by id', async () => {
    const opened = { record: projectRecord({ updatedAt: 1_000 }), files: projectFiles({ 'src/main.ts': 'opened' }) }
    const newer = { record: projectRecord({ updatedAt: 2_000 }), files: projectFiles({ 'src/main.ts': 'newer' }) }
    const storage = makeProjectStorageInMemory([opened, newer])

    await Effect.runPromise(
      openTemplateProgram(storedProjectKeyOf(opened.record.id)).pipe(
        Effect.flatMap(resetProjectProgram),
        Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
      )
    )

    expect(storage.projects.get(opened.record.id)?.files.get(projectPath('src/main.ts'))).toBe("console.log('hello')\n")
    expect(storage.projects.get(newer.record.id)?.files.get(projectPath('src/main.ts'))).toBe('newer')
  })
})

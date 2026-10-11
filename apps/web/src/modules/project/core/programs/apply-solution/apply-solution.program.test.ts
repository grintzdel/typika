import * as Effect from 'effect/Effect'
import { describe, expect, it } from 'vitest'

import { projectPath } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer } from '../../project.test-layer.ts'
import { openTemplateProgram } from '../open-template/open-template.program.ts'
import { saveProjectFilesProgram } from '../save-project-files/save-project-files.program.ts'
import { applySolutionProgram } from './apply-solution.program.ts'

const TEMPLATES = { 'sample-ts': templateFiles() }
const EXERCISE = 'sample-ts#fix-it'

const reopenAfterApplying = (edits: ReadonlyArray<readonly [string, string]>) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const project = yield* openTemplateProgram(EXERCISE)
      if (edits.length > 0)
        yield* saveProjectFilesProgram({
          project,
          edits: edits.map(([path, content]) => [projectPath(path), content] as const),
        })
      yield* applySolutionProgram(project)
      return yield* openTemplateProgram(EXERCISE)
    }).pipe(Effect.provide(makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory())))
  )

describe('applySolutionProgram', () => {
  it('replaces the files of an edited exercise with the solution', async () => {
    const reopened = await reopenAfterApplying([['src/extra.ts', 'mine']])

    expect(reopened.files.get(projectPath('src/main.ts'))).toBe("console.log('solution')\n")
    expect(reopened.files.has(projectPath('src/extra.ts'))).toBe(false)
  })

  it('creates the exercise project with the solution when it was never edited', async () => {
    const reopened = await reopenAfterApplying([])

    expect(reopened.files.get(projectPath('src/main.ts'))).toBe("console.log('solution')\n")
    expect(reopened.modifiedPaths).toEqual(['src/main.ts'])
  })
})

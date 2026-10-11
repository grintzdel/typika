import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import {
  failingProjectStorage,
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  type ProjectStorage,
} from '../../project.test-layer.ts'
import { openTemplateProgram } from './open-template.program.ts'

const open = (
  name: string,
  templates = { 'sample-ts': templateFiles() },
  storage: ProjectStorage = makeProjectStorageInMemory()
) => Effect.runPromiseExit(openTemplateProgram(name).pipe(Effect.provide(makeProjectTestLayer(templates, storage))))

const failureOf = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && exit.cause.reasons[0]

const TEMPLATE_PATHS = ['LICENSE', 'README.md', 'src/main.ts', 'tests/a.test.ts', 'typika.toml']

const storedProject = () => ({
  record: projectRecord(),
  files: projectFiles({
    ...Object.fromEntries([...templateFiles()].filter(([path]) => !path.startsWith('exercises/'))),
    'src/main.ts': 'edited',
  }),
})

describe('openTemplateProgram', () => {
  it('opens a template with its manifest and files', async () => {
    const exit = await open('sample-ts')

    expect(Exit.isSuccess(exit) && exit.value.manifest.name).toBe('sample-ts')
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
    expect(Exit.isSuccess(exit) && exit.value.modifiedPaths).toEqual([])
  })

  it('leaves the exercises out of the project', async () => {
    const exit = await open('sample-ts')

    expect(Exit.isSuccess(exit) && [...exit.value.files.keys()].toSorted()).toEqual(TEMPLATE_PATHS)
    expect(Exit.isSuccess(exit) && [...exit.value.templateFiles.keys()].toSorted()).toEqual(TEMPLATE_PATHS)
  })

  it('opens the files saved for the template, with the ones that changed', async () => {
    const exit = await open('sample-ts', undefined, makeProjectStorageInMemory([storedProject()]))

    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe('edited')
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.templateFiles).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
    expect(Exit.isSuccess(exit) && exit.value.modifiedPaths).toEqual(['src/main.ts'])
  })

  it('opens the template files when the storage cannot be read', async () => {
    const exit = await open('sample-ts', undefined, failingProjectStorage)

    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
  })

  it('fails when no template has that name', async () => {
    expect(failureOf(await open('missing-ts'))).toMatchObject({
      error: { _tag: 'ProjectTemplateNotFoundError', name: 'missing-ts' },
    })
  })

  it('fails with the manifest issues of an invalid template', async () => {
    const files = templateFiles()
    files.delete('LICENSE')

    const exit = await open('sample-ts', { 'sample-ts': files })

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectTemplateInvalidError', name: 'sample-ts' } })
  })
})

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Layer from 'effect/Layer'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectRecord } from '../../../__tests__/project.factory.ts'
import { templateFiles, templateToml } from '../../../__tests__/template.factory.ts'
import { embedProjectKeyOf, storedProjectKeyOf } from '../../domain/project.domain-model.ts'
import type { TemplateEntry } from '../../domain/template-entry.domain-model.ts'
import { TemplateFilesPort } from '../../ports/template-files.port.ts'
import { TemplateIndexPort } from '../../ports/template-index.port.ts'
import {
  failingProjectStorage,
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  testRefOf,
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

  it('opens the template at the ref the local project was created from, after the index has moved', async () => {
    const before = testRefOf('sample-ts', '000000000001')
    const files = new Map([
      [before, templateFiles('sample-ts', { 'src/main.ts': 'before' })],
      [testRefOf('sample-ts'), templateFiles('sample-ts', { 'src/main.ts': 'after' })],
    ])
    const storage = makeProjectStorageInMemory([{ ...storedProject(), record: projectRecord({ ref: before }) }])

    const exit = await Effect.runPromiseExit(
      openTemplateProgram('sample-ts').pipe(
        Effect.provide(
          Layer.mergeAll(
            makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage),
            Layer.succeed(TemplateFilesPort, { load: (ref) => Effect.succeed(files.get(ref) ?? new Map()) })
          )
        )
      )
    )

    expect(Exit.isSuccess(exit) && exit.value.ref).toBe(before)
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.templateFiles).get('src/main.ts')).toBe('before')
  })

  it('opens a template with the health the index gives it', async () => {
    const health = { status: 'broken', runUrl: null } as const
    const exit = await Effect.runPromiseExit(
      openTemplateProgram('sample-ts').pipe(
        Effect.provide(
          Layer.mergeAll(
            makeProjectTestLayer({ 'sample-ts': templateFiles() }),
            Layer.succeed(TemplateIndexPort, {
              entries: Effect.succeed<ReadonlyArray<TemplateEntry>>([
                {
                  name: 'sample-ts',
                  ref: testRefOf('sample-ts'),
                  role: 'template',
                  title: 'Sample',
                  summary: 'A sample.',
                  language: 'typescript',
                  level: 'beginner',
                  health,
                },
              ]),
            })
          )
        )
      )
    )

    expect(Exit.isSuccess(exit) && exit.value.health).toEqual(health)
  })

  it('opens a new project at the ref the index pins', async () => {
    const exit = await open('sample-ts')

    expect(Exit.isSuccess(exit) && exit.value.ref).toBe(testRefOf('sample-ts'))
  })

  it('opens the template files when the storage cannot be read', async () => {
    const exit = await open('sample-ts', undefined, failingProjectStorage)

    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
  })

  it('opens an embedded template on its own files, apart from the local projects', async () => {
    const exit = await open(embedProjectKeyOf('sample-ts'), undefined, makeProjectStorageInMemory([storedProject()]))

    expect(Exit.isSuccess(exit) && exit.value.templateName).toBe('sample-ts')
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('hello')\n"
    )
    expect(Exit.isSuccess(exit) && exit.value.isSaved).toBe(false)
    expect(Exit.isSuccess(exit) && exit.value.isShared).toBe(false)
  })

  it('opens the tour steps of the template', async () => {
    const files = templateFiles('sample-ts', {
      'typika.toml': `${templateToml()}\n[tour]\nsteps = ["tour/01-overview.md"]\n`,
      'tour/01-overview.md': '+++\nid = "overview"\ntitle = "Overview"\nfile = "src/main.ts"\n+++\n\nHello.\n',
    })

    const exit = await open('sample-ts', { 'sample-ts': files })

    expect(Exit.isSuccess(exit) && exit.value.tourSteps).toEqual([
      {
        path: 'tour/01-overview.md',
        id: 'overview',
        title: 'Overview',
        file: 'src/main.ts',
        also: [],
        body: 'Hello.\n',
      },
    ])
  })

  it('opens an exercise on its start state, with its statement, hints and solution', async () => {
    const files = templateFiles('sample-ts', {
      'typika.toml': templateToml().replace(
        'failing = ["tests/a.test.ts"]',
        'failing = ["tests/a.test.ts"]\nhints = ["hint-1.md"]'
      ),
      'exercises/fix-it/hint-1.md': 'Look at main.\n',
    })

    const exit = await open('sample-ts#fix-it', { 'sample-ts': files })

    expect(Exit.isSuccess(exit) && exit.value.origin).toEqual({
      kind: 'exercise',
      name: 'sample-ts',
      exercise: 'fix-it',
    })
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe(
      "console.log('start')\n"
    )
    expect(Exit.isSuccess(exit) && exit.value.exercise).toMatchObject({
      name: 'fix-it',
      kind: 'fix',
      title: 'Fix it',
      failing: ['tests/a.test.ts'],
      readme: '# Fix it\n',
      hints: ['Look at main.\n'],
    })
    expect(
      Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.exercise?.solutionFiles ?? []).get('src/main.ts')
    ).toBe("console.log('solution')\n")
  })

  it('opens the template project apart from its exercise projects', async () => {
    const storage = makeProjectStorageInMemory([
      {
        ...storedProject(),
        record: projectRecord({ origin: { kind: 'exercise', name: 'sample-ts', exercise: 'fix-it' } }),
      },
    ])

    const exit = await open('sample-ts', undefined, storage)

    expect(Exit.isSuccess(exit) && exit.value.modifiedPaths).toEqual([])
    expect(Exit.isSuccess(exit) && exit.value.exercise).toBeUndefined()
  })

  it('fails for an exercise the template does not declare', async () => {
    expect(failureOf(await open('sample-ts#missing'))).toMatchObject({
      error: { _tag: 'ProjectExerciseNotFoundError', name: 'sample-ts', exercise: 'missing' },
    })
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

  it('opens a stored project by its id, apart from a newer project of its template', async () => {
    const opened = storedProject()
    const newer = { ...storedProject(), record: projectRecord({ updatedAt: 5_000 }), files: projectFiles({}) }

    const exit = await open(
      storedProjectKeyOf(opened.record.id),
      undefined,
      makeProjectStorageInMemory([opened, newer])
    )

    expect(Exit.isSuccess(exit) && exit.value.projectId).toBe(opened.record.id)
    expect(Exit.isSuccess(exit) && exit.value.templateName).toBe('sample-ts')
    expect(Exit.isSuccess(exit) && exit.value.modifiedPaths).toEqual(['src/main.ts'])
  })

  it('opens a stored exercise project on its exercise', async () => {
    const stored = {
      ...storedProject(),
      record: projectRecord({ origin: { kind: 'exercise', name: 'sample-ts', exercise: 'fix-it' } }),
    }

    const exit = await open(storedProjectKeyOf(stored.record.id), undefined, makeProjectStorageInMemory([stored]))

    expect(Exit.isSuccess(exit) && exit.value.exercise?.name).toBe('fix-it')
    expect(Exit.isSuccess(exit) && new Map<string, unknown>(exit.value.files).get('src/main.ts')).toBe('edited')
  })

  it('opens a template by its name without a project id', async () => {
    const exit = await open('sample-ts', undefined, makeProjectStorageInMemory([storedProject()]))

    expect(Exit.isSuccess(exit) && exit.value.projectId).toBeUndefined()
  })

  it('fails for a project id this browser does not have', async () => {
    expect(failureOf(await open(storedProjectKeyOf('missing')))).toMatchObject({
      error: { _tag: 'ProjectNotFoundError', id: 'missing' },
    })
  })
})

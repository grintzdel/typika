import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { projectFiles, projectPath, projectRecord } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { sharedProjectKeyOf } from '../../domain/project.domain-model.ts'
import { encodeSharePayload, shareProjectIdOf, type SharePayload } from '../../domain/share-link.domain-model.ts'
import {
  makeProjectStorageInMemory,
  makeProjectTestLayer,
  testRefOf,
  type ProjectStorage,
} from '../../project.test-layer.ts'
import { resetProjectProgram } from '../reset-project/reset-project.program.ts'
import { saveProjectFilesProgram } from '../save-project-files/save-project-files.program.ts'
import { openTemplateProgram } from './open-template.program.ts'

const TEMPLATES = { 'sample-ts': templateFiles() }

const PAYLOAD: SharePayload = {
  n: 'My pricing',
  o: testRefOf('sample-ts'),
  r: 'browser-js',
  d: { 'src/main.ts': 'shared', 'src/extra.ts': 'extra' },
}

const encoded = (payload: SharePayload = PAYLOAD) => Effect.runPromise(encodeSharePayload(payload))

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromiseExit(effect)

const openShared = async (storage: ProjectStorage = makeProjectStorageInMemory(), payload?: SharePayload) =>
  run(
    openTemplateProgram(sharedProjectKeyOf(await encoded(payload))).pipe(
      Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
    )
  )

const fileOf = (exit: Exit.Exit<{ readonly files: ReadonlyMap<string, unknown> }, unknown>, path: string) =>
  Exit.isSuccess(exit) ? exit.value.files.get(path) : undefined

describe('opening a shared project', () => {
  it('opens the pinned template with the shared changes, without saving it', async () => {
    const storage = makeProjectStorageInMemory()

    const exit = await openShared(storage)

    expect(Exit.isSuccess(exit) && exit.value).toMatchObject({
      name: 'My pricing',
      templateName: 'sample-ts',
      ref: testRefOf('sample-ts'),
      origin: { kind: 'share-url', name: 'sample-ts' },
      isShared: true,
      isSaved: false,
      projectId: await Effect.runPromise(shareProjectIdOf(await encoded())),
      modifiedPaths: ['src/extra.ts', 'src/main.ts'],
    })
    expect(fileOf(exit, 'src/main.ts')).toBe('shared')
    expect(storage.projects.size).toBe(0)
  })

  it('opens the saved copy of a link already saved in this browser', async () => {
    const id = await Effect.runPromise(shareProjectIdOf(await encoded()))
    const storage = makeProjectStorageInMemory([
      {
        record: projectRecord({ id, origin: { kind: 'share-url', name: 'sample-ts' }, ref: testRefOf('sample-ts') }),
        files: projectFiles({ 'src/main.ts': 'mine' }),
      },
    ])

    const exit = await openShared(storage)

    expect(Exit.isSuccess(exit) && exit.value.isSaved).toBe(true)
    expect(fileOf(exit, 'src/main.ts')).toBe('mine')
  })

  it('opens a shared exercise from its start state', async () => {
    const exit = await openShared(undefined, { ...PAYLOAD, x: 'fix-it', d: { 'src/extra.ts': 'extra' } })

    expect(Exit.isSuccess(exit) && exit.value.exercise?.name).toBe('fix-it')
    expect(fileOf(exit, 'src/main.ts')).toBe("console.log('start')\n")
  })

  it('opens full files when the link carries them', async () => {
    const exit = await openShared(undefined, {
      n: 'x',
      o: testRefOf('sample-ts'),
      r: 'browser-js',
      f: { 'src/main.ts': 'only' },
    })

    expect(Exit.isSuccess(exit) && [...exit.value.files.keys()]).toEqual(['src/main.ts'])
  })

  it('fails for a link whose template is unknown', async () => {
    const exit = await openShared(undefined, { ...PAYLOAD, o: testRefOf('missing-ts') })

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ShareLinkInvalidError', reason: 'origin' },
    })
  })

  it('fails for a malformed link', async () => {
    const exit = await run(
      openTemplateProgram(sharedProjectKeyOf('1.garbage')).pipe(Effect.provide(makeProjectTestLayer(TEMPLATES)))
    )

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ShareLinkInvalidError', reason: 'invalid' },
    })
  })

  it('saves the shared files with the first edit, under the project id of the link', async () => {
    const storage = makeProjectStorageInMemory()
    const key = sharedProjectKeyOf(await encoded())

    await Effect.runPromise(
      openTemplateProgram(key).pipe(
        Effect.flatMap((project) => saveProjectFilesProgram({ project, edits: [[projectPath('README.md'), 'mine']] })),
        Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
      )
    )

    const [saved] = storage.projects.values()
    expect(saved?.record).toMatchObject({
      id: await Effect.runPromise(shareProjectIdOf(await encoded())),
      name: 'My pricing',
      origin: { kind: 'share-url', name: 'sample-ts' },
      ref: testRefOf('sample-ts'),
    })
    expect(Object.fromEntries(saved?.files ?? [])).toMatchObject({
      'src/main.ts': 'shared',
      'src/extra.ts': 'extra',
      'README.md': 'mine',
    })
  })

  it('saves nothing but the edits when saved without changes', async () => {
    const storage = makeProjectStorageInMemory()

    await Effect.runPromise(
      openTemplateProgram(sharedProjectKeyOf(await encoded())).pipe(
        Effect.flatMap((project) => saveProjectFilesProgram({ project, edits: [] })),
        Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
      )
    )

    expect([...storage.projects.values()][0]?.files.get(projectPath('src/main.ts'))).toBe('shared')
  })

  it('resets an unsaved shared project to its template', async () => {
    const storage = makeProjectStorageInMemory()
    const key = sharedProjectKeyOf(await encoded())

    const reopened = await Effect.runPromise(
      openTemplateProgram(key).pipe(
        Effect.flatMap(resetProjectProgram),
        Effect.flatMap(() => openTemplateProgram(key)),
        Effect.provide(makeProjectTestLayer(TEMPLATES, storage))
      )
    )

    expect(reopened.modifiedPaths).toEqual([])
    expect(reopened.isSaved).toBe(true)
  })
})

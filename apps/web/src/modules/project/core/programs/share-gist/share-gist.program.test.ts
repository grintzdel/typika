import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { GitHubApiError } from '../../../../github/core/domain/errors/github-api.error.ts'
import {
  makeGistsInMemory,
  makeGitHubSessionsInMemory,
  makeGitHubTestLayer,
  TEST_GITHUB_SESSION,
} from '../../../../github/core/github.test-layer.ts'
import { projectFiles, projectPath, projectRecord } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { GIST_SHARE_FILE } from '../../domain/gist-share.domain-model.ts'
import { gistProjectKeyOf, storedProjectKeyOf } from '../../domain/project.domain-model.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer, testRefOf } from '../../project.test-layer.ts'
import { openTemplateProgram } from '../open-template/open-template.program.ts'
import { shareGistProgram } from './share-gist.program.ts'

const TEMPLATES = { 'sample-ts': templateFiles() }

const signedIn = () => makeGitHubSessionsInMemory({ session: TEST_GITHUB_SESSION })

const templateProjectFiles = () =>
  Object.fromEntries([...templateFiles()].filter(([path]) => !path.startsWith('exercises/')))

const share = (
  key: string,
  edits: Readonly<Record<string, string>>,
  layer: ReturnType<typeof makeProjectTestLayer>,
  isPublic = false
) =>
  Effect.runPromiseExit(
    openTemplateProgram(key).pipe(
      Effect.flatMap((project) =>
        shareGistProgram({
          project,
          files: new Map([
            ...project.files,
            ...Object.entries(edits).map(([path, content]) => [projectPath(path), content] as const),
          ]),
          isPublic,
          appOrigin: 'https://typika.dev',
        })
      ),
      Effect.provide(layer)
    )
  )

const open = (key: string, layer: ReturnType<typeof makeProjectTestLayer>) =>
  Effect.runPromiseExit(openTemplateProgram(key).pipe(Effect.provide(layer)))

const causeOf = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : 'success')

describe('shareGistProgram', () => {
  it('creates a secret gist that reopens as the same files by /g/<id>', async () => {
    const gists = makeGistsInMemory()
    const github = makeGitHubTestLayer({ sessions: signedIn(), gists })
    const layer = makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory(), github)

    const shared = await share('sample-ts', { 'src/main.ts': 'edited' }, layer)

    expect(shared).toEqual(
      Exit.succeed({ id: 'gist1', url: 'https://typika.dev/g/gist1', htmlUrl: 'https://gist.github.example.com/gist1' })
    )
    expect(gists.drafts.get('gist1')).toMatchObject({ description: 'sample-ts — Typika', isPublic: false })
    expect(JSON.parse(gists.gists.get('gist1')?.files.get(GIST_SHARE_FILE) ?? '')).toMatchObject({
      o: testRefOf('sample-ts'),
      r: 'browser-js',
    })
    const anonymous = makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory(), makeGitHubTestLayer({ gists }))
    const reopened = await open(gistProjectKeyOf('gist1'), anonymous)
    expect(Exit.isSuccess(reopened) && reopened.value).toMatchObject({
      name: 'sample-ts',
      templateName: 'sample-ts',
      ref: testRefOf('sample-ts'),
      origin: { kind: 'gist', name: 'sample-ts', gistId: 'gist1' },
      isShared: true,
      isSaved: false,
      modifiedPaths: ['src/main.ts'],
    })
    expect(Exit.isSuccess(reopened) && reopened.value.files.get(projectPath('src/main.ts'))).toBe('edited')
  })

  it('makes the gist public when asked', async () => {
    const gists = makeGistsInMemory()
    const github = makeGitHubTestLayer({ sessions: signedIn(), gists })

    await share('sample-ts', {}, makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory(), github), true)

    expect(gists.drafts.get('gist1')?.isPublic).toBe(true)
  })

  it('names the exercise of an exercise project', async () => {
    const gists = makeGistsInMemory()
    const github = makeGitHubTestLayer({ sessions: signedIn(), gists })
    const layer = makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory(), github)

    await share('sample-ts#fix-it', { 'src/main.ts': 'fixed' }, layer)

    const reopened = await open(gistProjectKeyOf('gist1'), layer)
    expect(Exit.isSuccess(reopened) && reopened.value.origin).toEqual({
      kind: 'gist',
      name: 'sample-ts',
      gistId: 'gist1',
      exercise: 'fix-it',
    })
  })

  it('updates the gist a saved project was already shared to', async () => {
    const record = projectRecord({ ref: testRefOf('sample-ts') })
    const storage = makeProjectStorageInMemory([
      { record, files: projectFiles({ ...templateProjectFiles(), 'src/main.ts': 'first' }) },
    ])
    const gists = makeGistsInMemory()
    const layer = makeProjectTestLayer(TEMPLATES, storage, makeGitHubTestLayer({ sessions: signedIn(), gists }))

    await share(storedProjectKeyOf(record.id), {}, layer)
    const again = await share(storedProjectKeyOf(record.id), { 'src/main.ts': 'second' }, layer)

    expect(Exit.isSuccess(again) && again.value.id).toBe('gist1')
    expect(gists.gists.size).toBe(1)
    expect(gists.gists.get('gist1')?.files.get('src__main.ts')).toBe('second')
    expect(storage.projects.get(record.id)?.record.gistId).toBe('gist1')
  })

  it('creates a new gist when the one it remembers is gone', async () => {
    const record = projectRecord({ ref: testRefOf('sample-ts'), gistId: 'deleted' })
    const storage = makeProjectStorageInMemory([{ record, files: projectFiles(templateProjectFiles()) }])
    const layer = makeProjectTestLayer(TEMPLATES, storage, makeGitHubTestLayer({ sessions: signedIn() }))

    const shared = await share(storedProjectKeyOf(record.id), {}, layer)

    expect(Exit.isSuccess(shared) && shared.value.id).toBe('gist1')
    expect(storage.projects.get(record.id)?.record.gistId).toBe('gist1')
  })

  it.each([
    ['no session', makeGitHubSessionsInMemory()],
    ['a session without the gist scope', makeGitHubSessionsInMemory({ session: { accessToken: 't', scopes: [] } })],
  ])('asks to sign in with %s', async (_, sessions) => {
    const gists = makeGistsInMemory()
    const github = makeGitHubTestLayer({ sessions, gists })

    const shared = await share('sample-ts', {}, makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory(), github))

    expect(causeOf(shared)).toContain('"reason":"required"')
    expect(gists.gists.size).toBe(0)
  })

  it('forgets a session GitHub no longer accepts', async () => {
    const sessions = signedIn()
    const gists = { ...makeGistsInMemory(), create: () => Effect.fail(new GitHubApiError({ reason: 'unauthorized' })) }
    const github = makeGitHubTestLayer({ sessions, gists })

    const shared = await share('sample-ts', {}, makeProjectTestLayer(TEMPLATES, makeProjectStorageInMemory(), github))

    expect(causeOf(shared)).toContain('"reason":"unauthorized"')
    expect(sessions.current()).toBeUndefined()
  })
})

const gistOf = (files: Readonly<Record<string, string>>, isTruncated = false) => ({
  id: 'abc',
  htmlUrl: 'https://gist.github.example.com/abc',
  files: new Map(Object.entries(files)),
  isTruncated,
})
const layerWith = (gists: ReturnType<typeof makeGistsInMemory>, storage = makeProjectStorageInMemory()) =>
  makeProjectTestLayer(TEMPLATES, storage, makeGitHubTestLayer({ gists }))
const description = (fields: object) => JSON.stringify({ v: 1, n: 'remix', r: 'browser-js', files: {}, ...fields })

describe('openTemplateProgram on a gist', () => {
  it.each([
    ['a gist that does not exist', makeGistsInMemory(), 'not-found'],
    ['a gist that is not a Typika project', makeGistsInMemory([gistOf({ 'notes.md': 'hello' })]), 'invalid'],
    [
      'a gist GitHub truncated',
      makeGistsInMemory([gistOf({ [GIST_SHARE_FILE]: description({ o: testRefOf('sample-ts') }) }, true)]),
      'invalid',
    ],
    [
      'a template the index does not have',
      makeGistsInMemory([gistOf({ [GIST_SHARE_FILE]: description({ o: testRefOf('other-ts') }) })]),
      'origin',
    ],
    ['a gist without origin', makeGistsInMemory([gistOf({ [GIST_SHARE_FILE]: description({}) })]), 'origin'],
  ])('fails for %s', async (_, gists, reason) => {
    const opened = await open(gistProjectKeyOf('abc'), layerWith(gists))

    expect(causeOf(opened)).toContain('GistUnavailableError')
    expect(causeOf(opened)).toContain(`"reason":"${reason}"`)
  })

  it('reads the gist anonymously when GitHub no longer accepts the session', async () => {
    const stored = makeGistsInMemory([gistOf({ [GIST_SHARE_FILE]: description({ o: testRefOf('sample-ts') }) })])
    const gists = {
      ...stored,
      get: (id: string, accessToken: string | undefined) =>
        accessToken === undefined
          ? stored.get(id, undefined)
          : Effect.fail(new GitHubApiError({ reason: 'unauthorized' })),
    }
    const layer = makeProjectTestLayer(
      TEMPLATES,
      makeProjectStorageInMemory(),
      makeGitHubTestLayer({ sessions: signedIn(), gists })
    )

    expect(Exit.isSuccess(await open(gistProjectKeyOf('abc'), layer))).toBe(true)
  })

  it('reopens the copy saved from the gist rather than the gist itself', async () => {
    const gists = makeGistsInMemory()
    const github = makeGitHubTestLayer({ sessions: signedIn(), gists })
    const storage = makeProjectStorageInMemory()
    const layer = makeProjectTestLayer(TEMPLATES, storage, github)
    await share('sample-ts', { 'src/main.ts': 'shared' }, layer)
    const first = await open(gistProjectKeyOf('gist1'), layer)
    if (!Exit.isSuccess(first) || first.value.projectId === undefined) throw new Error('expected a project')
    await Effect.runPromise(
      storage.saveTemplateEdits({
        project: projectRecord({ id: first.value.projectId, origin: first.value.origin }),
        initialFiles: projectFiles(Object.fromEntries(first.value.files) as Record<string, string>),
        edits: projectFiles({ 'src/main.ts': 'mine' }),
        match: 'id',
      })
    )

    const second = await open(gistProjectKeyOf('gist1'), layer)

    expect(Exit.isSuccess(second) && second.value.isSaved).toBe(true)
    expect(Exit.isSuccess(second) && second.value.files.get(projectPath('src/main.ts'))).toBe('mine')
  })
})

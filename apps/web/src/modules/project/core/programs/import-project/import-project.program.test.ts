import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { GitHubApiError } from '../../../../github/core/domain/errors/github-api.error.ts'
import {
  makeContentsInMemory,
  makeGitHubSessionsInMemory,
  makeGitHubTestLayer,
  TEST_GITHUB_SESSION,
} from '../../../../github/core/github.test-layer.ts'
import { projectPath } from '../../../__tests__/project.factory.ts'
import { templateFiles, templateToml } from '../../../__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer, testRefOf } from '../../project.test-layer.ts'
import { importFileProgram, importFromUrlProgram } from './import-project.program.ts'

const REMOTE = templateFiles('remote-ts', { 'typika.toml': templateToml('remote-ts').replace('Sample', 'Remote') })

const layerWith = (
  contents = makeContentsInMemory({ 'octocat/patterns/remote/ts': { commit: 'abcdef0123456789', files: REMOTE } }),
  storage = makeProjectStorageInMemory(),
  sessions = makeGitHubSessionsInMemory()
) => makeProjectTestLayer({ 'sample-ts': templateFiles() }, storage, makeGitHubTestLayer({ contents, sessions }))

const failureOf = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && exit.cause.reasons[0]

describe('importFromUrlProgram', () => {
  it('copies a template of the catalogue named by its reference, without asking GitHub', async () => {
    const storage = makeProjectStorageInMemory()
    const contents = makeContentsInMemory()

    const id = await Effect.runPromise(
      importFromUrlProgram('github:typika-app/templates/sample/ts').pipe(Effect.provide(layerWith(contents, storage)))
    )

    expect(storage.projects.get(id)?.record).toMatchObject({
      name: 'Sample',
      origin: { kind: 'personal', name: 'sample-ts' },
      ref: testRefOf('sample-ts'),
    })
    expect(contents.requests).toEqual([])
  })

  it('downloads a template from GitHub, pinned at the commit it was read at', async () => {
    const storage = makeProjectStorageInMemory()
    const contents = makeContentsInMemory({
      'octocat/patterns/remote/ts': { commit: 'abcdef0123456789', files: REMOTE },
    })

    const id = await Effect.runPromise(
      importFromUrlProgram('https://github.com/octocat/patterns/tree/main/remote/ts').pipe(
        Effect.provide(layerWith(contents, storage, makeGitHubSessionsInMemory({ session: TEST_GITHUB_SESSION })))
      )
    )

    const stored = storage.projects.get(id)
    expect(stored?.record).toMatchObject({
      name: 'Remote',
      origin: { kind: 'personal', name: 'remote-ts', language: 'typescript' },
      ref: 'github:octocat/patterns/remote/ts@abcdef012345',
    })
    expect(stored?.files.get(projectPath('src/main.ts'))).toBe("console.log('hello')\n")
    expect(stored?.files.has(projectPath('exercises/fix-it/README.md'))).toBe(false)
    expect(contents.requests).toEqual([
      { ref: { owner: 'octocat', repo: 'patterns', path: 'remote/ts', ref: 'main' }, accessToken: 'gho_test' },
    ])
  })

  it('fails for an input that names no template', async () => {
    const exit = await Effect.runPromiseExit(importFromUrlProgram('strategy').pipe(Effect.provide(layerWith())))

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectSourceInvalidError', reason: 'url' } })
  })

  it.each([
    ['not-found', new GitHubApiError({ reason: 'not-found' }), 'not-found'],
    ['rate-limited', new GitHubApiError({ reason: 'rate-limited' }), 'rate-limited'],
    ['incomplete', new GitHubApiError({ reason: 'incomplete' }), 'too-large'],
    ['unavailable', new GitHubApiError({ reason: 'unavailable' }), 'unavailable'],
  ])('reports a GitHub failure %s', async (_, failure, reason) => {
    const exit = await Effect.runPromiseExit(
      importFromUrlProgram('github:octocat/patterns/remote/ts').pipe(
        Effect.provide(layerWith(makeContentsInMemory({}, failure)))
      )
    )

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectSourceUnavailableError', reason } })
  })

  it('reports the issues of a folder that is not a valid template', async () => {
    const contents = makeContentsInMemory({
      'octocat/patterns/broken': { commit: 'abcdef0123456789', files: new Map([['typika.toml', 'schema = 1\n']]) },
    })

    const exit = await Effect.runPromiseExit(
      importFromUrlProgram('github:octocat/patterns/broken').pipe(Effect.provide(layerWith(contents)))
    )

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectTemplateInvalidError' } })
  })
})

describe('importFileProgram', () => {
  it('creates a project from a lone typika.toml', async () => {
    const storage = makeProjectStorageInMemory()

    const id = await Effect.runPromise(
      importFileProgram({ fileName: 'typika.toml', bytes: strToU8(templateToml('pricing-ts')) }).pipe(
        Effect.provide(layerWith(undefined, storage))
      )
    )

    expect(storage.projects.get(id)?.record).toMatchObject({
      name: 'Sample',
      origin: { kind: 'personal', name: 'pricing-ts', language: 'typescript' },
    })
    expect(storage.projects.get(id)?.files.has(projectPath('src/main.ts'))).toBe(true)
  })

  it('creates a project from a zip exported by Typika', async () => {
    const storage = makeProjectStorageInMemory()
    const bytes = zipSync(Object.fromEntries([...REMOTE].map(([path, content]) => [path, strToU8(content)])))

    const id = await Effect.runPromise(
      importFileProgram({ fileName: 'remote.zip', bytes }).pipe(Effect.provide(layerWith(undefined, storage)))
    )

    expect(storage.projects.get(id)?.record.origin).toMatchObject({ kind: 'personal', name: 'remote-ts' })
  })

  it('fails for a zip without a manifest', async () => {
    const bytes = zipSync({ 'src/main.ts': strToU8('') })

    const exit = await Effect.runPromiseExit(
      importFileProgram({ fileName: 'project.zip', bytes }).pipe(Effect.provide(layerWith()))
    )

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectManifestMissingError' } })
  })

  it('reports the issues of an invalid manifest', async () => {
    const exit = await Effect.runPromiseExit(
      importFileProgram({ fileName: 'typika.toml', bytes: strToU8('name = 3\n') }).pipe(Effect.provide(layerWith()))
    )

    expect(failureOf(exit)).toMatchObject({ error: { _tag: 'ProjectTemplateInvalidError' } })
  })
})

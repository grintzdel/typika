import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { GitHubApiError } from '../../../../github/core/domain/errors/github-api.error.ts'
import {
  makeGitHubSessionsInMemory,
  makeGitHubTestLayer,
  makeRepositoriesInMemory,
} from '../../../../github/core/github.test-layer.ts'
import { projectPath } from '../../../__tests__/project.factory.ts'
import { templateFiles } from '../../../__tests__/template.factory.ts'
import { makeProjectStorageInMemory, makeProjectTestLayer, testRefOf } from '../../project.test-layer.ts'
import { openTemplateProgram } from '../open-template/open-template.program.ts'
import { pushRepositoryProgram } from './push-repository.program.ts'

const canPush = () =>
  makeGitHubSessionsInMemory({ session: { accessToken: 'gho_test', scopes: ['gist', 'public_repo'] } })

const push = (
  github: ReturnType<typeof makeGitHubTestLayer>,
  input: { readonly includeTypikaFiles?: boolean; readonly without?: string } = {}
) =>
  Effect.runPromiseExit(
    openTemplateProgram('sample-ts').pipe(
      Effect.flatMap((project) =>
        pushRepositoryProgram({
          project,
          files: new Map(
            [...project.files, [projectPath('src/main.ts'), 'edited'] as const].filter(
              ([path]) => path !== input.without
            )
          ),
          name: 'sample-remix',
          description: 'A remix',
          includeTypikaFiles: input.includeTypikaFiles ?? true,
          appOrigin: 'https://typika.dev',
        })
      ),
      Effect.provide(makeProjectTestLayer({ 'sample-ts': templateFiles() }, makeProjectStorageInMemory(), github))
    )
  )

const causeOf = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : 'success')

describe('pushRepositoryProgram', () => {
  it('creates a repository with the current files, whose typika.toml names the template as parent', async () => {
    const repositories = makeRepositoriesInMemory()

    const pushed = await push(makeGitHubTestLayer({ sessions: canPush(), repositories }))

    expect(pushed).toEqual(
      Exit.succeed({ fullName: 'octocat/sample-remix', htmlUrl: 'https://github.example.com/octocat/sample-remix' })
    )
    const draft = repositories.drafts.get('sample-remix')
    expect(draft).toMatchObject({ description: 'A remix', message: 'Initial commit from Typika' })
    expect(draft?.files.get('src/main.ts')).toBe('edited')
    expect(draft?.files.get('typika.toml')).toContain(`parent = "${testRefOf('sample-ts')}"`)
  })

  it('leaves the Typika files out when asked', async () => {
    const repositories = makeRepositoriesInMemory()

    await push(makeGitHubTestLayer({ sessions: canPush(), repositories }), { includeTypikaFiles: false })

    const paths = [...(repositories.drafts.get('sample-remix')?.files.keys() ?? [])]
    expect(paths).toContain('src/main.ts')
    expect(paths.filter((path) => path === 'typika.toml' || path.startsWith('tour/'))).toEqual([])
  })

  it('adds a README that links to the template when the project has none', async () => {
    const repositories = makeRepositoriesInMemory()

    await push(makeGitHubTestLayer({ sessions: canPush(), repositories }), { without: 'README.md' })

    expect(repositories.drafts.get('sample-remix')?.files.get('README.md')).toContain(
      '(https://typika.dev/templates/sample-ts)'
    )
  })

  it.each([
    ['no session', makeGitHubSessionsInMemory()],
    [
      'a session that can only create gists',
      makeGitHubSessionsInMemory({ session: { accessToken: 't', scopes: ['gist'] } }),
    ],
  ])('asks to sign in with %s', async (_, sessions) => {
    const repositories = makeRepositoriesInMemory()

    const pushed = await push(makeGitHubTestLayer({ sessions, repositories }))

    expect(causeOf(pushed)).toContain('"reason":"required"')
    expect(repositories.drafts.size).toBe(0)
  })

  it('reports a name already taken, and keeps the session', async () => {
    const sessions = canPush()
    const github = makeGitHubTestLayer({ sessions, repositories: makeRepositoriesInMemory() })
    await push(github)

    const again = await push(github)

    expect(causeOf(again)).toContain('"reason":"name-taken"')
    expect(sessions.current()).toBeDefined()
  })

  it('forgets a session GitHub no longer accepts', async () => {
    const sessions = canPush()
    const repositories = { create: () => Effect.fail(new GitHubApiError({ reason: 'unauthorized' })) }

    const pushed = await push(makeGitHubTestLayer({ sessions, repositories }))

    expect(causeOf(pushed)).toContain('"reason":"unauthorized"')
    expect(sessions.current()).toBeUndefined()
  })
})

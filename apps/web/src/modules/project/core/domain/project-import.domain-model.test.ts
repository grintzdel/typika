import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Option from 'effect/Option'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { projectPath } from '../../__tests__/project.factory.ts'
import { templateToml } from '../../__tests__/template.factory.ts'
import { blankProjectFiles } from './personal-project.domain-model.ts'
import { filesOfArchive, filesOfManifest, templateRefOfInput } from './project-import.domain-model.ts'

describe('templateRefOfInput', () => {
  it.each([
    ['github:octocat/patterns/strategy/ts', { owner: 'octocat', repo: 'patterns', path: 'strategy/ts' }],
    ['  github:octocat/patterns@v1  ', { owner: 'octocat', repo: 'patterns', ref: 'v1' }],
    ['https://github.com/octocat/patterns', { owner: 'octocat', repo: 'patterns' }],
    ['https://github.com/octocat/patterns.git', { owner: 'octocat', repo: 'patterns' }],
    [
      'https://github.com/octocat/patterns/tree/main/strategy/ts',
      { owner: 'octocat', repo: 'patterns', path: 'strategy/ts', ref: 'main' },
    ],
    [
      'https://github.com/octocat/patterns/blob/v1/strategy/ts/typika.toml',
      { owner: 'octocat', repo: 'patterns', path: 'strategy/ts', ref: 'v1' },
    ],
    [
      'https://raw.githubusercontent.com/octocat/patterns/main/typika.toml',
      { owner: 'octocat', repo: 'patterns', ref: 'main' },
    ],
  ])('reads %s', (input, ref) => {
    expect(templateRefOfInput(input)).toEqual(Option.some(ref))
  })

  it.each(['', 'strategy-ts', 'https://gitlab.com/octocat/patterns', 'https://github.com/octocat', 'github:..'])(
    'rejects %j',
    (input) => {
      expect(templateRefOfInput(input)).toEqual(Option.none())
    }
  )
})

const zip = (files: Readonly<Record<string, string>>) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)])))

describe('filesOfArchive', () => {
  it('reads the text files of a zip exported by Typika', async () => {
    const files = await Effect.runPromise(filesOfArchive(zip({ 'typika.toml': 'a', 'src/main.ts': 'b' })))

    expect(Object.fromEntries(files)).toEqual({ 'typika.toml': 'a', 'src/main.ts': 'b' })
  })

  it('drops the folder that wraps every file, and the files of the archiver', async () => {
    const files = await Effect.runPromise(
      filesOfArchive(zip({ 'project/typika.toml': 'a', 'project/src/main.ts': 'b', '__MACOSX/._x': 'c' }))
    )

    expect([...files.keys()].toSorted()).toEqual(['src/main.ts', 'typika.toml'])
  })

  it('fails for bytes that are not a zip', async () => {
    const exit = await Effect.runPromiseExit(filesOfArchive(strToU8('not a zip')))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectSourceInvalidError', reason: 'archive' },
    })
  })
})

describe('filesOfManifest', () => {
  it('gives a lone manifest the skeleton of its language, with its entry point', async () => {
    const manifest = templateToml('pricing-ts').replace('entry = "src/main.ts"', 'entry = "src/app.ts"')

    const files = await Effect.runPromise(filesOfManifest(manifest))

    expect(files.get(projectPath('typika.toml'))).toBe(manifest)
    expect(files.has(projectPath('src/app.ts'))).toBe(true)
    expect(files.has(projectPath('tests/greeting.test.ts'))).toBe(true)
  })

  it('keeps the skeleton entry point when the manifest names it', async () => {
    const manifest = blankProjectFiles({ name: 'pricing', language: 'go' }).get(projectPath('typika.toml')) ?? ''

    const files = await Effect.runPromise(filesOfManifest(manifest))

    expect(files.get(projectPath('cmd/app/main.go'))).toContain('greeting.Greet')
  })

  it('fails with the issues of an invalid manifest', async () => {
    const exit = await Effect.runPromiseExit(filesOfManifest('schema = 1\nname = "x"\n'))

    expect(Exit.isFailure(exit) && exit.cause.reasons[0]).toMatchObject({
      error: { _tag: 'ProjectTemplateInvalidError' },
    })
  })
})

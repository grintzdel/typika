import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { GIST_SHARE_FILE, gistFilesOf, projectOfGistFiles } from './gist-share.domain-model.ts'

const REF = 'github:typika-app/templates/sample/ts@0123456789ab'

const shared = (files: Readonly<Record<string, string>>, exercise?: string) =>
  gistFilesOf({
    name: 'sample (remix)',
    ref: REF,
    runtime: 'browser-js',
    exercise,
    files: new Map(Object.entries(files)),
  })

const shareOf = (files: ReadonlyMap<string, string>): unknown => JSON.parse(files.get(GIST_SHARE_FILE) ?? '')

const reasonOf = async (files: ReadonlyMap<string, string>) => {
  const exit = await Effect.runPromiseExit(projectOfGistFiles(files))
  return Exit.isFailure(exit) ? JSON.stringify(exit.cause) : 'success'
}

describe('gistFilesOf', () => {
  it('flattens the paths and describes the project in typika.share.json', () => {
    const files = shared({ 'src/main.ts': 'main', 'README.md': '# Sample' }, 'fix-it')

    expect([...files.keys()]).toEqual(['README.md', 'src__main.ts', GIST_SHARE_FILE])
    expect(files.get('src__main.ts')).toBe('main')
    expect(shareOf(files)).toEqual({
      v: 1,
      n: 'sample (remix)',
      o: REF,
      r: 'browser-js',
      x: 'fix-it',
      files: { 'README.md': 'README.md', 'src__main.ts': 'src/main.ts' },
    })
  })

  it('keeps apart two paths that flatten to the same name, and a file named like the description', () => {
    const files = shared({ 'a/b.ts': 'nested', 'a__b.ts': 'flat', [GIST_SHARE_FILE]: '{}' })

    expect(new Set(files.values()).size).toBe(4)
    expect(shareOf(files)).toEqual(
      expect.objectContaining({
        files: { 'a__b.ts': 'a/b.ts', 'a__b.ts~2': 'a__b.ts', [`${GIST_SHARE_FILE}~2`]: GIST_SHARE_FILE },
      })
    )
  })

  it('carries blank files in the description, since a gist file cannot be blank', () => {
    const files = shared({ 'src/main.ts': 'main', 'src/.gitkeep': '', 'notes.txt': '\n' })

    expect([...files.keys()]).toEqual(['src__main.ts', GIST_SHARE_FILE])
    expect(shareOf(files)).toEqual(expect.objectContaining({ blank: { 'src/.gitkeep': '', 'notes.txt': '\n' } }))
  })
})

describe('projectOfGistFiles', () => {
  it('reads back the project it wrote', async () => {
    const source = { 'a/b.ts': 'nested', 'a__b.ts': 'flat', 'src/.gitkeep': '', 'README.md': '# Sample' }

    const project = await Effect.runPromise(projectOfGistFiles(shared(source, 'fix-it')))

    expect(project).toMatchObject({ name: 'sample (remix)', ref: REF, exercise: 'fix-it' })
    expect(Object.fromEntries(project.files)).toEqual(source)
  })

  it('ignores the files of the gist that the description does not list', async () => {
    const files = new Map([...shared({ 'src/main.ts': 'main' }), ['added-on-github.md', 'hello']])

    const project = await Effect.runPromise(projectOfGistFiles(files))

    expect([...project.files.keys()]).toEqual(['src/main.ts'])
  })

  it('drops a path that would leave the project', async () => {
    const files = new Map([
      ['evil', 'x'],
      [GIST_SHARE_FILE, JSON.stringify({ v: 1, n: 'x', o: REF, r: 'browser-js', files: { evil: '../evil.ts' } })],
    ])

    expect((await Effect.runPromise(projectOfGistFiles(files))).files.size).toBe(0)
  })

  it.each([
    ['a gist without description', new Map([['src__main.ts', 'main']]), 'invalid'],
    ['a description that is not JSON', new Map([[GIST_SHARE_FILE, 'not json']]), 'invalid'],
    [
      'a listed file that is missing',
      new Map([[GIST_SHARE_FILE, JSON.stringify({ v: 1, n: 'x', r: 'browser-js', files: { 'gone.ts': 'gone.ts' } })]]),
      'invalid',
    ],
    [
      'a newer format',
      new Map([[GIST_SHARE_FILE, JSON.stringify({ v: 2, n: 'x', r: 'browser-js', files: {} })]]),
      'newer',
    ],
  ])('refuses %s', async (_, files, reason) => {
    expect(await reasonOf(files)).toContain(`"reason":"${reason}"`)
  })
})

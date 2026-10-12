import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as Effect from 'effect/Effect'
import { beforeAll, describe, expect, it } from 'vitest'

import { makeGitResolver, parseCheckout, type PinnedRef } from './resolve-ref.ts'

let root: string
let templatesRepo: string
let first: string

const gitIn = (cwd: string, ...args: ReadonlyArray<string>) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()

const write = (cwd: string, path: string, content: string | Uint8Array) => {
  mkdirSync(join(cwd, path, '..'), { recursive: true })
  writeFileSync(join(cwd, path), content)
}

const commit = (cwd: string, message: string) => {
  gitIn(cwd, 'add', '-A')
  gitIn(cwd, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', message)
  return gitIn(cwd, 'rev-parse', '--short=12', 'HEAD')
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'registry-tools-'))
  gitIn(root, 'init', '-q')
  write(root, 'templates/strategy/ts/typika.toml', 'name = "strategy-ts"\n')
  write(root, 'templates/strategy/ts/src/main.ts', 'console.log("v1")\n')
  write(root, 'templates/strategy/ts/tour/diagram.png', new Uint8Array([0x89, 0x50, 0x00, 0x47]))
  write(root, 'templates/strategy-base/ts/typika.toml', 'name = "strategy-base-ts"\n')
  first = commit(root, 'first')
  write(root, 'templates/strategy/ts/src/main.ts', 'console.log("v2")\n')
  commit(root, 'second')

  templatesRepo = mkdtempSync(join(tmpdir(), 'registry-tools-templates-'))
  gitIn(templatesRepo, 'init', '-q')
  write(templatesRepo, 'strategy/ts/typika.toml', 'name = "strategy-ts"\n')
})

const resolve = (ref: Partial<PinnedRef> = {}) =>
  Effect.runPromise(
    Effect.result(
      makeGitResolver({ 'typika/templates': { repo: root, prefix: 'templates' } })({
        owner: 'typika',
        repo: 'templates',
        path: 'strategy/ts',
        ref: first,
        ...ref,
      })
    )
  )

describe('makeGitResolver', () => {
  it('reads the files of the template as they were at the pinned commit', async () => {
    const result = await resolve()

    expect(result._tag).toBe('Success')
    if (result._tag !== 'Success') return
    expect(result.success.get('src/main.ts')).toBe('console.log("v1")\n')
    expect(result.success.get('tour/diagram.png')).toEqual(new Uint8Array([0x89, 0x50, 0x00, 0x47]))
    expect([...result.success.keys()].toSorted()).toEqual(['src/main.ts', 'tour/diagram.png', 'typika.toml'])
  })

  it('fails on a commit that does not exist', async () => {
    const result = await resolve({ ref: 'deadbeefdead' })

    expect(result).toMatchObject({ _tag: 'Failure', failure: { reason: 'commit deadbeefdead does not exist' } })
  })

  it('fails on a path with no files at the pinned commit', async () => {
    const result = await resolve({ path: 'observer/ts' })

    expect(result).toMatchObject({ _tag: 'Failure', failure: { reason: `no template at ${first}` } })
  })

  it('fails on a repository without a local checkout', async () => {
    const result = await resolve({ owner: 'someone', repo: 'patterns' })

    expect(result).toMatchObject({
      _tag: 'Failure',
      failure: { reason: 'no local checkout of github:someone/patterns' },
    })
  })

  it('reads a template from a repository of its own, from its root', async () => {
    const ref = commit(templatesRepo, 'extracted')

    const result = await Effect.runPromise(
      Effect.result(
        makeGitResolver({ 'typika/templates': { repo: templatesRepo, prefix: '' } })({
          owner: 'typika',
          repo: 'templates',
          path: 'strategy/ts',
          ref,
        })
      )
    )

    expect(result._tag).toBe('Success')
    if (result._tag !== 'Success') return
    expect([...result.success.keys()]).toEqual(['typika.toml'])
  })
})

describe('parseCheckout', () => {
  it('maps a repository to the root of a local clone', () => {
    expect(parseCheckout('typika/templates=../templates', '/work/registry')).toEqual({
      'typika/templates': { repo: '/work/templates', prefix: '' },
    })
  })

  it('rejects a value without a repository', () => {
    expect(() => parseCheckout('../templates', '/work')).toThrow('owner/repo=<directory>')
  })
})

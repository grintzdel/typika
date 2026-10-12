import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { filesOf, projectFixture, projectPath } from '../__tests__/project.factory.ts'
import type { RuntimeFsError } from '../domain/errors/runtime-fs.error.ts'
import { makeVirtualFs } from './virtual-fs.ts'

const limits = { files: 3, bytes: 10 }

const failureOf = <A>(effect: Effect.Effect<A, RuntimeFsError>) => {
  const exit = Effect.runSyncExit(effect)
  return Exit.isFailure(exit) ? exit.cause : undefined
}

describe('makeVirtualFs', () => {
  it('starts from the snapshot', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': 'a' })))
    expect([...fs.files()]).toEqual([['a.ts', 'a']])
  })

  it('writes, renames and deletes files', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': 'a' })))
    Effect.runSync(fs.writeFile(projectPath('b.ts'), 'b'))
    Effect.runSync(fs.rename(projectPath('a.ts'), projectPath('c.ts')))
    Effect.runSync(fs.deleteFile(projectPath('b.ts')))
    expect([...fs.files()]).toEqual([['c.ts', 'a']])
  })

  it('replaces everything on sync', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': 'a' })))
    Effect.runSync(fs.sync(projectFixture({ 'b.ts': 'b' })))
    expect([...fs.files().keys()]).toEqual(['typika.toml', 'b.ts'])
  })

  it('refuses a file beyond the file count limit', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': '', 'b.ts': '', 'c.ts': '' }), limits))
    expect(failureOf(fs.writeFile(projectPath('d.ts'), ''))).toBeDefined()
    Effect.runSync(fs.writeFile(projectPath('a.ts'), 'overwrite'))
  })

  it('refuses a write beyond the size limit, counted in UTF-8 bytes', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': '12345' }), limits))
    Effect.runSync(fs.writeFile(projectPath('b.ts'), '12345'))
    expect(failureOf(fs.writeFile(projectPath('b.ts'), '12345é'))).toBeDefined()
    expect(fs.files().get(projectPath('b.ts'))).toBe('12345')
  })

  it('refuses a snapshot beyond the limits', () => {
    expect(failureOf(makeVirtualFs(filesOf({ 'a.ts': '12345678901' }), limits))).toBeDefined()
  })

  it('fails to delete or rename a missing file', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': 'a' })))
    expect(failureOf(fs.deleteFile(projectPath('x.ts')))).toBeDefined()
    expect(failureOf(fs.rename(projectPath('x.ts'), projectPath('y.ts')))).toBeDefined()
  })

  it('refuses to rename onto an existing file', () => {
    const fs = Effect.runSync(makeVirtualFs(filesOf({ 'a.ts': 'a', 'b.ts': 'b' })))
    expect(failureOf(fs.rename(projectPath('a.ts'), projectPath('b.ts')))).toBeDefined()
  })
})

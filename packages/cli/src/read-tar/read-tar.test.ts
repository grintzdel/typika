import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { gunzipSync } from 'node:zlib'

import { afterEach, describe, expect, it } from 'vitest'

import { readTar } from './read-tar.ts'

const LONG_DIR = `${'deep/'.repeat(25)}end`

let dir: string | undefined

const tarOf = async (files: Readonly<Record<string, string | Uint8Array>>) => {
  dir = await mkdtemp(join(tmpdir(), 'typika-tar-'))
  const root = join(dir, 'repo-abc123')
  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      await mkdir(join(root, path, '..'), { recursive: true })
      await writeFile(join(root, path), content)
    })
  )
  execFileSync('tar', ['-czf', join(dir, 'archive.tgz'), '-C', dir, 'repo-abc123'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  })
  return gunzipSync(await readFile(join(dir, 'archive.tgz')))
}

afterEach(async () => {
  if (dir !== undefined) await rm(dir, { recursive: true, force: true })
})

describe('readTar', () => {
  it('reads the regular files of an archive with their paths', async () => {
    const entries = readTar(await tarOf({ 'README.md': '# Hello\n', 'src/main.ts': 'run()\n' }))

    expect(new Map(entries.map((entry) => [entry.path, new TextDecoder().decode(entry.content)]))).toEqual(
      new Map([
        ['repo-abc123/README.md', '# Hello\n'],
        ['repo-abc123/src/main.ts', 'run()\n'],
      ])
    )
  })

  it('keeps paths longer than 100 characters', async () => {
    const entries = readTar(await tarOf({ [`${LONG_DIR}/file.txt`]: 'x' }))

    expect(entries.map((entry) => entry.path)).toEqual([`repo-abc123/${LONG_DIR}/file.txt`])
  })

  it('keeps binary content byte for byte', async () => {
    const bytes = new Uint8Array([0, 255, 1, 128, 0])

    const [entry] = readTar(await tarOf({ 'image.png': bytes }))

    expect(entry?.content).toEqual(bytes)
  })

  it('reads the archives that git archive writes', () => {
    const archive = execFileSync('git', ['archive', '--format=tar', '--prefix=typika-head/', 'HEAD', 'package.json'], {
      cwd: join(import.meta.dirname, '..', '..', '..', '..'),
    })

    expect(readTar(new Uint8Array(archive)).map((entry) => entry.path)).toEqual(['typika-head/package.json'])
  })
})

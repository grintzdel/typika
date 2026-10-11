import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { promisify } from 'node:util'

import { MANIFEST_FILE } from '@typika/manifest'

import type { TemplateSet } from '../check-templates/check-templates.ts'

const SKIPPED = new Set(['node_modules', '.git'])

const walk = async (dir: string): Promise<ReadonlyArray<string>> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => !SKIPPED.has(entry.name))
      .map(async (entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))
  )
  return nested.flat()
}

const posix = (path: string) => path.split(sep).join('/')

export type ListFiles = (root: string) => Promise<ReadonlyArray<string>>

export const listFilesWithGit: ListFiles = async (root) => {
  const { stdout } = await promisify(execFile)(
    'git',
    ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { maxBuffer: 64 * 1024 * 1024 }
  )
  return stdout
    .split('\0')
    .filter((path) => path !== '')
    .map((path) => join(root, path))
}

export const listFilesOnDisk: ListFiles = walk

export const contentOf = (bytes: Uint8Array): string | Uint8Array => {
  if (bytes.includes(0)) return bytes
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return bytes
  }
}

export const readTemplates = async (root: string, listFiles: ListFiles = listFilesOnDisk): Promise<TemplateSet> => {
  const paths = await listFiles(root)
  const templateDirs = paths
    .filter((path) => path.endsWith(`${sep}${MANIFEST_FILE}`) && !posix(relative(root, path)).includes('exercises/'))
    .map((path) => path.slice(0, -MANIFEST_FILE.length - 1))
  const entries = await Promise.all(
    templateDirs.map(async (dir) => {
      const files = await Promise.all(
        paths
          .filter((path) => path.startsWith(`${dir}${sep}`))
          .map(async (path) => [posix(relative(dir, path)), contentOf(await readFile(path))] as const)
      )
      return [posix(relative(root, dir)), new Map(files)] as const
    })
  )
  return new Map(entries)
}

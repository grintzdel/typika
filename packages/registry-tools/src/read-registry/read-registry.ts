import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { RegistryCategory } from '../domain/constants/registry-category.constant.ts'

export const VOCABULARY_FILE = 'vocabulary.toml'

export type RegistrySource = {
  readonly entries: ReadonlyArray<{ readonly file: string; readonly source: string }>
  readonly vocabulary: string
}

const entriesIn = async (root: string, category: string) => {
  const dir = join(root, 'templates', category)
  const names = await readdir(dir).catch(() => [])
  return Promise.all(
    names
      .filter((name) => name.endsWith('.toml'))
      .toSorted()
      .map(async (name) => ({ file: `templates/${category}/${name}`, source: await readFile(join(dir, name), 'utf8') }))
  )
}

export const readRegistry = async (root: string): Promise<RegistrySource> => ({
  entries: (await Promise.all(Object.values(RegistryCategory).map((category) => entriesIn(root, category)))).flat(),
  vocabulary: await readFile(join(root, VOCABULARY_FILE), 'utf8'),
})

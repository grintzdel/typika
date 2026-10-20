import { readFile } from 'node:fs/promises'
import { relative, sep } from 'node:path'

import type { TemplateFiles } from '@typika/manifest'
import { contentOf, listFilesOnDisk, listFilesWithGit } from '@typika/template-check'

export const readProject = async (dir: string): Promise<TemplateFiles> => {
  const paths = await listFilesWithGit(dir).catch(() => listFilesOnDisk(dir))
  return new Map(
    await Promise.all(
      paths.map(async (path) => [relative(dir, path).split(sep).join('/'), contentOf(await readFile(path))] as const)
    )
  )
}

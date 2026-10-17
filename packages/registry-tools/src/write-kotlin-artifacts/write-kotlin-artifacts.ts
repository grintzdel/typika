import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { KotlinArtifactFile } from '../compile-kotlin-artifacts/compile-kotlin-artifacts.ts'

export const KOTLIN_ARTIFACTS_DIR = 'artifacts/kotlin'

const SUFFIX = '.json'

export const readKotlinArtifactKeys = async (root: string): Promise<ReadonlySet<string>> =>
  new Set(
    (await readdir(join(root, KOTLIN_ARTIFACTS_DIR)).catch(() => []))
      .filter((file) => file.endsWith(SUFFIX))
      .map((file) => file.slice(0, -SUFFIX.length))
  )

export const writeKotlinArtifacts = async (
  root: string,
  keys: Iterable<string>,
  artifacts: ReadonlyArray<KotlinArtifactFile>
) => {
  const dir = join(root, KOTLIN_ARTIFACTS_DIR)
  const wanted = new Set(keys)
  const removed = [...(await readKotlinArtifactKeys(root))].filter((key) => !wanted.has(key)).toSorted()
  await mkdir(dir, { recursive: true })
  await Promise.all([
    ...removed.map((key) => rm(join(dir, `${key}${SUFFIX}`))),
    ...artifacts.map(({ key, compilation }) =>
      writeFile(join(dir, `${key}${SUFFIX}`), `${JSON.stringify(compilation)}\n`)
    ),
  ])
  return { written: artifacts.length, removed }
}

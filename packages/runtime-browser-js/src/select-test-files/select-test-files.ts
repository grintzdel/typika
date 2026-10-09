import { DEFAULT_TEST_INCLUDE } from '@typika/manifest'
import type { ProjectSnapshot, TestOptions } from '@typika/runtime-core'

import { matchGlob } from '../match-glob/match-glob.ts'

const ALWAYS_EXCLUDED = ['exercises/**']

export const selectTestFiles = (snapshot: ProjectSnapshot, options: TestOptions): ReadonlyArray<string> => {
  const paths: ReadonlyArray<string> = [...snapshot.files.keys()]
  if (options.files !== undefined) {
    const existing = new Set(paths)
    return options.files.filter((path) => existing.has(path))
  }
  const { manifest } = snapshot
  const include = (manifest.tests?.include ?? DEFAULT_TEST_INCLUDE[manifest.facets.language]).map(matchGlob)
  const exclude = [...(manifest.tests?.exclude ?? []), ...ALWAYS_EXCLUDED].map(matchGlob)
  return paths
    .filter((path) => include.some((matches) => matches(path)) && !exclude.some((matches) => matches(path)))
    .toSorted()
}

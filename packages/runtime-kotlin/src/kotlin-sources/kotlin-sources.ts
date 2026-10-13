import { matchGlob } from '@typika/manifest'
import type { FileContent } from '@typika/runtime-core'

import type { KotlinSourceFile } from '../domain/compile-protocol.domain-model.ts'
import { KotlinCompileMode } from '../domain/constants/kotlin-compile-mode.constant.ts'

export const DEFAULT_TEST_GLOBS = ['src/test/**']

const PACKAGE = /^\s*package\s+([\w.]+)/m
const TOP_LEVEL_CLASS =
  /^(?:@[\w.]+(?:\([^)]*\))?\s+)*(?:(?:public|internal|private|open|abstract|final|data|sealed|enum|value)\s+)*(?:class|object)\s+(`[^`]+`|\w+)/gm

const decoder = new TextDecoder()

export const kotlinSources = (
  files: Iterable<readonly [string, FileContent]>,
  mode: KotlinCompileMode,
  testGlobs: ReadonlyArray<string>
): ReadonlyArray<KotlinSourceFile> => {
  const isTest = testGlobs.map(matchGlob)
  return [...files]
    .filter(([path]) => path.endsWith('.kt'))
    .filter(([path]) => mode === KotlinCompileMode.TEST || !isTest.some((matches) => matches(path)))
    .map(([path, content]) => ({ path, content: typeof content === 'string' ? content : decoder.decode(content) }))
    .toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

export const findKotlinClasses = (sources: ReadonlyArray<KotlinSourceFile>): ReadonlyMap<string, string> =>
  new Map(
    sources.flatMap(({ path, content }) => {
      const pkg = PACKAGE.exec(content)?.[1]
      return [...content.matchAll(TOP_LEVEL_CLASS)].map((match) => {
        const name = (match[1] ?? '').replaceAll('`', '')
        return [pkg === undefined ? name : `${pkg}.${name}`, path] as const
      })
    })
  )

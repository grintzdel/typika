import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import type { TestLocation } from '@typika/runtime-core'

export type StackMapperOptions = {
  readonly sourceMap: string
  readonly moduleUrl: string
  readonly projectFiles: Iterable<string>
}

export type MapStack = (stack: string) => ReadonlyArray<TestLocation>

const escapeRegExp = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

export const makeStackMapper = ({ sourceMap, moduleUrl, projectFiles }: StackMapperOptions): MapStack => {
  const map = new TraceMap(sourceMap)
  const files = new Set(projectFiles)
  const frame = new RegExp(`${escapeRegExp(moduleUrl)}:(\\d+):(\\d+)`, 'g')

  return (stack) =>
    [...stack.matchAll(frame)].flatMap((match): ReadonlyArray<TestLocation> => {
      const position = originalPositionFor(map, { line: Number(match[1]), column: Number(match[2]) - 1 })
      if (position.source === null || !files.has(position.source)) return []
      return [{ file: position.source, line: position.line, column: position.column + 1 }]
    })
}

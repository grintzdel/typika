import * as Effect from 'effect/Effect'

import { RuntimeLimit } from '../domain/constants/runtime-limits.constant.ts'
import { RuntimeFsError } from '../domain/errors/runtime-fs.error.ts'
import type { FileContent, ProjectPath } from '../domain/project.domain-model.ts'
import type { RuntimeFs } from '../domain/runtime.port.ts'

export type VirtualFsLimits = {
  readonly files: number
  readonly bytes: number
}

export type VirtualFs = RuntimeFs & {
  readonly files: () => ReadonlyMap<ProjectPath, FileContent>
}

const DEFAULT_LIMITS: VirtualFsLimits = { files: RuntimeLimit.PROJECT_FILES, bytes: RuntimeLimit.PROJECT_BYTES }

const encoder = new TextEncoder()
const sizeOf = (content: FileContent) => (typeof content === 'string' ? encoder.encode(content).length : content.length)
const totalSize = (files: ReadonlyMap<ProjectPath, FileContent>) =>
  [...files.values()].reduce((total, content) => total + sizeOf(content), 0)

const missing = (path: string) => Effect.fail(new RuntimeFsError({ path, reason: 'File not found' }))

const checkLimits = (
  files: ReadonlyMap<ProjectPath, FileContent>,
  path: string,
  limits: VirtualFsLimits
): Effect.Effect<void, RuntimeFsError> => {
  if (files.size > limits.files) {
    return Effect.fail(new RuntimeFsError({ path, reason: `A project holds at most ${limits.files} files` }))
  }
  if (totalSize(files) > limits.bytes) {
    return Effect.fail(new RuntimeFsError({ path, reason: `A project holds at most ${limits.bytes} bytes` }))
  }
  return Effect.void
}

export const makeVirtualFs = (
  initial: ReadonlyMap<ProjectPath, FileContent>,
  limits: VirtualFsLimits = DEFAULT_LIMITS
): Effect.Effect<VirtualFs, RuntimeFsError> =>
  Effect.gen(function* () {
    let files = new Map(initial)
    yield* checkLimits(files, '', limits)

    const commit = (next: Map<ProjectPath, FileContent>, path: string) =>
      checkLimits(next, path, limits).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            files = next
          })
        )
      )

    return {
      files: () => files,
      writeFile: (path, content) => Effect.suspend(() => commit(new Map(files).set(path, content), path)),
      deleteFile: (path) =>
        Effect.suspend(() => {
          if (!files.has(path)) return missing(path)
          const next = new Map(files)
          next.delete(path)
          return commit(next, path)
        }),
      rename: (from, to) =>
        Effect.suspend(() => {
          const content = files.get(from)
          if (content === undefined) return missing(from)
          if (files.has(to)) return Effect.fail(new RuntimeFsError({ path: to, reason: 'File already exists' }))
          const next = new Map(files)
          next.delete(from)
          return commit(next.set(to, content), to)
        }),
      sync: (snapshot) => Effect.suspend(() => commit(new Map(snapshot.files), '')),
    }
  })

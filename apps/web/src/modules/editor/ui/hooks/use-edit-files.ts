import { ProjectPathSchema, type ProjectPath } from '@typika/runtime-core'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { useEffect, useRef, useState } from 'react'

export type FileEdit = readonly [ProjectPath, string]

export type FileStructureChange = {
  readonly written: ReadonlyArray<FileEdit>
  readonly removed: ReadonlyArray<ProjectPath>
}

export type FileStructureRequest = {
  readonly written: ReadonlyArray<readonly [string, string]>
  readonly removed: ReadonlyArray<string>
}

export type EditSinks = {
  readonly onPersist: (edits: ReadonlyArray<FileEdit>) => void
  readonly onSync: (edits: ReadonlyArray<FileEdit>) => void
  readonly onStructureChange?: (change: FileStructureChange) => void
}

const FLUSH_DELAY_MS = 300
const decodePath = Schema.decodeUnknownOption(ProjectPathSchema)

export const useEditFiles = (sinks: EditSinks) => {
  const pending = useRef(new Map<ProjectPath, string>())
  const edited = useRef(new Map<string, string>())
  const removed = useRef(new Set<string>())
  const [editedFiles, setEditedFiles] = useState<ReadonlyMap<string, string>>(new Map())
  const [removedPaths, setRemovedPaths] = useState<ReadonlySet<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestSinks = useRef(sinks)

  useEffect(() => {
    latestSinks.current = sinks
  })

  const clearPending = () => {
    clearTimeout(timer.current)
    pending.current.clear()
  }

  const discardPending = () => {
    clearPending()
    edited.current.clear()
    removed.current.clear()
    setEditedFiles(new Map())
    setRemovedPaths(new Set())
  }

  const commitPending = (): ReadonlyArray<FileEdit> => {
    const edits = [...pending.current]
    clearPending()
    if (edits.length > 0) setEditedFiles(new Map(edited.current))
    if (edits.length > 0) latestSinks.current.onPersist(edits)
    return edits
  }

  const flush = () => {
    const edits = commitPending()
    if (edits.length > 0) latestSinks.current.onSync(edits)
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flush()
    }
  }, [])

  const handleChange = (path: string, content: string) => {
    const projectPath = decodePath(path)
    if (Option.isNone(projectPath)) return
    pending.current.set(projectPath.value, content)
    edited.current.set(path, content)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, FLUSH_DELAY_MS)
  }

  const handleStructureChange = (request: FileStructureRequest) => {
    const change: FileStructureChange = {
      written: request.written.flatMap(([path, content]) =>
        Option.match(decodePath(path), { onNone: () => [], onSome: (valid) => [[valid, content] as const] })
      ),
      removed: request.removed.flatMap((path) => Option.toArray(decodePath(path))),
    }
    flush()
    for (const path of change.removed) {
      edited.current.delete(path)
      removed.current.add(path)
    }
    for (const [path, content] of change.written) {
      edited.current.set(path, content)
      removed.current.delete(path)
    }
    setEditedFiles(new Map(edited.current))
    setRemovedPaths(new Set(removed.current))
    latestSinks.current.onStructureChange?.(change)
  }

  const editedContentOf = (path: string): string | undefined => edited.current.get(path)

  const filesOf = (base: ReadonlyMap<string, string>): ReadonlyMap<string, string> =>
    new Map([...base, ...editedFiles].filter(([path]) => !removedPaths.has(path)))

  return {
    handleChange,
    handleStructureChange,
    commitPending,
    discardPending,
    editedContentOf,
    editedFiles,
    filesOf,
  }
}

import { ProjectPathSchema, type ProjectPath } from '@typika/runtime-core'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { useEffect, useRef } from 'react'

export type FileEdit = readonly [ProjectPath, string]

export type EditSinks = {
  readonly onPersist: (edits: ReadonlyArray<FileEdit>) => void
  readonly onSync: (edits: ReadonlyArray<FileEdit>) => void
}

const FLUSH_DELAY_MS = 300
const decodePath = Schema.decodeUnknownOption(ProjectPathSchema)

export const useEditFiles = (sinks: EditSinks) => {
  const pending = useRef(new Map<ProjectPath, string>())
  const edited = useRef(new Map<string, string>())
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
  }

  const commitPending = (): ReadonlyArray<FileEdit> => {
    const edits = [...pending.current]
    clearPending()
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

  const editedContentOf = (path: string): string | undefined => edited.current.get(path)

  return { handleChange, commitPending, discardPending, editedContentOf }
}

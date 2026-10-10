import { ProjectPathSchema, type ProjectPath } from '@typika/runtime-core'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import { useEffect, useRef } from 'react'

export type FileEdit = readonly [ProjectPath, string]

const FLUSH_DELAY_MS = 300
const decodePath = Schema.decodeUnknownOption(ProjectPathSchema)

export const useEditFiles = (onFlush: (edits: ReadonlyArray<FileEdit>) => void) => {
  const pending = useRef(new Map<ProjectPath, string>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestOnFlush = useRef(onFlush)

  useEffect(() => {
    latestOnFlush.current = onFlush
  })

  const takePending = (): ReadonlyArray<FileEdit> => {
    clearTimeout(timer.current)
    const edits = [...pending.current]
    pending.current.clear()
    return edits
  }

  const flush = () => {
    const edits = takePending()
    if (edits.length > 0) latestOnFlush.current(edits)
  }

  useEffect(() => flush, [])

  const handleChange = (path: string, content: string) => {
    const projectPath = decodePath(path)
    if (Option.isNone(projectPath)) return
    pending.current.set(projectPath.value, content)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, FLUSH_DELAY_MS)
  }

  return { handleChange, takePending }
}

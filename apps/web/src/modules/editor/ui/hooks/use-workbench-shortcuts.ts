import { useEffect, useRef } from 'react'

import { commandOf, WorkbenchCommand } from '../../core/domain/workbench-shortcuts.domain-model.ts'
import { isMacPlatform } from '../components/platform.ts'

export type WorkbenchShortcuts = {
  readonly onCloseTab: () => void
  readonly onStepTab: (step: 1 | -1) => void
  readonly onQuickOpen: () => void
}

const EDITOR_AREA = '.cm-editor, [data-editor-area]'

const closest = (target: EventTarget | null, selector: string) =>
  target instanceof Element ? target.closest(selector) : null

export const useWorkbenchShortcuts = (shortcuts: WorkbenchShortcuts) => {
  const latest = useRef(shortcuts)

  useEffect(() => {
    latest.current = shortcuts
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closest(event.target, '[role="dialog"]') !== null) return
      const isMac = isMacPlatform()
      const command = commandOf(event, isMac)
      if (command === undefined) return
      const isStep = command === WorkbenchCommand.NEXT_TAB || command === WorkbenchCommand.PREVIOUS_TAB
      if (isStep && !isMac && closest(event.target, EDITOR_AREA) === null) return
      event.preventDefault()
      event.stopPropagation()
      if (command === WorkbenchCommand.CLOSE_TAB) latest.current.onCloseTab()
      else if (command === WorkbenchCommand.QUICK_OPEN) latest.current.onQuickOpen()
      else latest.current.onStepTab(command === WorkbenchCommand.NEXT_TAB ? 1 : -1)
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])
}

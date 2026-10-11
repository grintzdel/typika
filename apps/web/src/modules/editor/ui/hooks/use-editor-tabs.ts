import { useState } from 'react'

import {
  activeTabOf,
  closeTab,
  EMPTY_TABS,
  openFile,
  openFiles,
  type EditorTab,
  type EditorTabs,
} from '../../core/domain/editor-tabs.domain-model.ts'
import type { LineRange } from '../components/tour-highlight.ts'

type TabsState = EditorTabs & {
  readonly highlight: { readonly key: string; readonly range: LineRange } | undefined
}

export const useEditorTabs = (initialPath: string | undefined) => {
  const [state, setState] = useState<TabsState | undefined>(undefined)

  if (state === undefined && initialPath !== undefined)
    setState({ ...openFile(EMPTY_TABS, initialPath), highlight: undefined })

  const update = (change: (current: TabsState) => TabsState) =>
    setState((current) => change(current ?? { ...EMPTY_TABS, highlight: undefined }))

  const current = state ?? { ...EMPTY_TABS, highlight: undefined }
  const activeTab = activeTabOf(current)

  return {
    tabs: current.tabs,
    activeTab,
    highlight: current.highlight?.key === activeTab?.key ? current.highlight?.range : undefined,
    handleOpenFile: (path: string) => update((tabs) => ({ ...tabs, ...openFile(tabs, path) })),
    handleOpenTabs: (tabs: ReadonlyArray<EditorTab>, range: LineRange | undefined) =>
      update((previous) => {
        const next = openFiles(previous, tabs)
        const key = tabs[0]?.key
        return { ...next, highlight: range === undefined || key === undefined ? undefined : { key, range } }
      }),
    handleSelect: (key: string) => update((tabs) => ({ ...tabs, activeKey: key })),
    handleClose: (key: string) => update((tabs) => ({ ...tabs, ...closeTab(tabs, key) })),
  }
}

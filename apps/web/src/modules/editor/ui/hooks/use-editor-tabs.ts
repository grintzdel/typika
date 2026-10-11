import { useState } from 'react'

import {
  activeTabOf,
  closeTab,
  EditorTabKind,
  EMPTY_TABS,
  openFile,
  openFiles,
  type EditorTab,
  type EditorTabs,
} from '../../core/domain/editor-tabs.domain-model.ts'
import type { LineRange } from '../components/tour-highlight.ts'

type TabsState = EditorTabs & {
  readonly highlight: { readonly key: string; readonly range: LineRange } | undefined
  readonly editorTab: EditorTab | undefined
}

const EMPTY_STATE: TabsState = { ...EMPTY_TABS, highlight: undefined, editorTab: undefined }

const isCode = (tab: EditorTab | undefined): tab is EditorTab =>
  tab?.kind === EditorTabKind.FILE || tab?.kind === EditorTabKind.ORIGINAL

const withEditorTab = (state: TabsState): TabsState => {
  const active = activeTabOf(state)
  return isCode(active) ? { ...state, editorTab: active } : state
}

export const useEditorTabs = (initialPath: string | undefined) => {
  const [state, setState] = useState<TabsState | undefined>(undefined)

  if (state === undefined && initialPath !== undefined)
    setState(withEditorTab({ ...EMPTY_STATE, ...openFile(EMPTY_TABS, initialPath) }))

  const update = (change: (current: TabsState) => TabsState) =>
    setState((current) => withEditorTab(change(current ?? EMPTY_STATE)))

  const current = state ?? EMPTY_STATE
  const { editorTab } = current

  return {
    tabs: current.tabs,
    activeTab: activeTabOf(current),
    editorTab,
    highlight: current.highlight?.key === editorTab?.key ? current.highlight?.range : undefined,
    handleOpenFile: (path: string) => update((tabs) => ({ ...tabs, ...openFile(tabs, path) })),
    handleOpenTabs: (tabs: ReadonlyArray<EditorTab>, range: LineRange | undefined) =>
      update((previous) => {
        const next = openFiles(previous, tabs)
        const key = tabs[0]?.key
        return {
          ...previous,
          ...next,
          highlight: range === undefined || key === undefined ? undefined : { key, range },
        }
      }),
    handleSelect: (key: string) => update((tabs) => ({ ...tabs, activeKey: key })),
    handleClose: (key: string) => update((tabs) => ({ ...tabs, ...closeTab(tabs, key) })),
  }
}

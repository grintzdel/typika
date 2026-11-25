import { useState } from 'react'

import {
  activeTabOf,
  closeTab,
  EditorTabKind,
  EMPTY_TABS,
  openFile,
  openFiles,
  renameTabs,
  retainFileTabs,
  stepTab,
  type EditorTab,
  type EditorTabs,
} from '../../core/domain/editor-tabs.domain-model.ts'
import type { SourceRange } from '../../core/domain/language-service.domain-model.ts'
import type { LineRange } from '../components/tour-highlight.ts'

export type RevealRange = { readonly from: number; readonly to: number }

type TabsState = EditorTabs & {
  readonly highlight: { readonly key: string; readonly range: LineRange } | undefined
  readonly reveal: { readonly key: string; readonly range: RevealRange } | undefined
  readonly editorTab: EditorTab | undefined
}

const EMPTY_STATE: TabsState = { ...EMPTY_TABS, highlight: undefined, reveal: undefined, editorTab: undefined }

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
    reveal: current.reveal?.key === current.activeKey ? current.reveal?.range : undefined,
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
    handleCloseActive: () =>
      update((tabs) => (tabs.activeKey === undefined ? tabs : { ...tabs, ...closeTab(tabs, tabs.activeKey) })),
    handleRenamePaths: (moves: ReadonlyArray<readonly [string, string]>) =>
      update((tabs) => {
        const renamed = renameTabs({ ...tabs, tabs: tabs.editorTab === undefined ? [] : [tabs.editorTab] }, moves)
        return {
          ...tabs,
          ...renameTabs(tabs, moves),
          editorTab: renamed.tabs[0],
          highlight: undefined,
          reveal: undefined,
        }
      }),
    handleRetainFiles: (paths: ReadonlySet<string>) =>
      update((tabs) => ({
        ...tabs,
        ...retainFileTabs(tabs, paths),
        editorTab:
          tabs.editorTab?.kind === EditorTabKind.FILE && !paths.has(tabs.editorTab.path) ? undefined : tabs.editorTab,
      })),
    handleStep: (step: 1 | -1) => update((tabs) => ({ ...tabs, ...stepTab(tabs, step) })),
    handleReveal: ({ path, from, to }: SourceRange) =>
      update((tabs) => ({ ...tabs, ...openFile(tabs, path), reveal: { key: path, range: { from, to } } })),
  }
}

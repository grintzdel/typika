export const EditorTabKind = {
  FILE: 'file',
  ORIGINAL: 'original',
  BASE_DIFF: 'base-diff',
  MINE_DIFF: 'mine-diff',
} as const

export type EditorTabKind = (typeof EditorTabKind)[keyof typeof EditorTabKind]

export type EditorTab = {
  readonly key: string
  readonly path: string
  readonly kind: EditorTabKind
}

export type EditorTabs = {
  readonly tabs: ReadonlyArray<EditorTab>
  readonly activeKey: string | undefined
}

export const EMPTY_TABS: EditorTabs = { tabs: [], activeKey: undefined }

const tabOf =
  (kind: EditorTabKind) =>
  (path: string): EditorTab => ({ key: kind === EditorTabKind.FILE ? path : `${kind}:${path}`, path, kind })

export const fileTab = tabOf(EditorTabKind.FILE)
export const originalTab = tabOf(EditorTabKind.ORIGINAL)
export const baseDiffTab = tabOf(EditorTabKind.BASE_DIFF)
export const mineDiffTab = tabOf(EditorTabKind.MINE_DIFF)

export const activeTabOf = (state: EditorTabs): EditorTab | undefined =>
  state.tabs.find((tab) => tab.key === state.activeKey)

export const openFiles = (state: EditorTabs, tabs: ReadonlyArray<EditorTab>): EditorTabs => {
  const first = tabs[0]
  if (first === undefined) return state
  const added = tabs.filter(
    (tab, index) =>
      !state.tabs.some((open) => open.key === tab.key) && tabs.findIndex((other) => other.key === tab.key) === index
  )
  return { tabs: [...state.tabs, ...added], activeKey: first.key }
}

export const openFile = (state: EditorTabs, path: string): EditorTabs => openFiles(state, [fileTab(path)])

export const closeTab = (state: EditorTabs, key: string): EditorTabs => {
  const index = state.tabs.findIndex((tab) => tab.key === key)
  if (index === -1) return state
  const tabs = state.tabs.filter((tab) => tab.key !== key)
  if (state.activeKey !== key) return { tabs, activeKey: state.activeKey }
  return { tabs, activeKey: (tabs[index] ?? tabs[index - 1])?.key }
}

export type EditorTab = {
  readonly key: string
  readonly path: string
  readonly isOriginal: boolean
}

export type EditorTabs = {
  readonly tabs: ReadonlyArray<EditorTab>
  readonly activeKey: string | undefined
}

export const EMPTY_TABS: EditorTabs = { tabs: [], activeKey: undefined }

export const fileTab = (path: string): EditorTab => ({ key: path, path, isOriginal: false })

export const originalTab = (path: string): EditorTab => ({ key: `original:${path}`, path, isOriginal: true })

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

import { describe, expect, it } from 'vitest'

import {
  activeTabOf,
  closeTab,
  EMPTY_TABS,
  fileTab,
  openFile,
  openFiles,
  originalTab,
  type EditorTabs,
} from './editor-tabs.domain-model.ts'

const withFiles = (...paths: ReadonlyArray<string>): EditorTabs =>
  paths.reduce((tabs, path) => openFile(tabs, path), EMPTY_TABS)

describe('editor tabs', () => {
  it('opens a file in a new active tab', () => {
    const tabs = withFiles('src/main.ts', 'src/quote.ts')

    expect(tabs.tabs.map((tab) => tab.key)).toEqual(['src/main.ts', 'src/quote.ts'])
    expect(activeTabOf(tabs)).toEqual(fileTab('src/quote.ts'))
  })

  it('activates a file that is already open', () => {
    const tabs = openFile(withFiles('src/main.ts', 'src/quote.ts'), 'src/main.ts')

    expect(tabs.tabs).toHaveLength(2)
    expect(tabs.activeKey).toBe('src/main.ts')
  })

  it('opens several tabs in order and activates the first', () => {
    const tabs = openFiles(withFiles('src/quote.ts'), [fileTab('src/a.ts'), fileTab('src/quote.ts'), fileTab('b.ts')])

    expect(tabs.tabs.map((tab) => tab.key)).toEqual(['src/quote.ts', 'src/a.ts', 'b.ts'])
    expect(tabs.activeKey).toBe('src/a.ts')
  })

  it('keeps the original of a file apart from the file', () => {
    const tabs = openFiles(withFiles('src/quote.ts'), [originalTab('src/quote.ts')])

    expect(tabs.tabs.map((tab) => tab.key)).toEqual(['src/quote.ts', 'original:src/quote.ts'])
    expect(activeTabOf(tabs)).toEqual({ key: 'original:src/quote.ts', path: 'src/quote.ts', isOriginal: true })
  })

  it('activates the next tab when the active one closes', () => {
    const tabs = closeTab(openFile(withFiles('a.ts', 'b.ts', 'c.ts'), 'b.ts'), 'b.ts')

    expect(tabs.tabs.map((tab) => tab.key)).toEqual(['a.ts', 'c.ts'])
    expect(tabs.activeKey).toBe('c.ts')
  })

  it('activates the previous tab when the last one closes', () => {
    const tabs = closeTab(withFiles('a.ts', 'b.ts'), 'b.ts')

    expect(tabs.activeKey).toBe('a.ts')
  })

  it('keeps the active tab when another one closes', () => {
    const tabs = closeTab(withFiles('a.ts', 'b.ts'), 'a.ts')

    expect(tabs.activeKey).toBe('b.ts')
  })

  it('has no active tab once every tab is closed', () => {
    expect(activeTabOf(closeTab(withFiles('a.ts'), 'a.ts'))).toBeUndefined()
  })
})

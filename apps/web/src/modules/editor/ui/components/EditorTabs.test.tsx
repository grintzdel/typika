import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { fileTab, originalTab, type EditorTab } from '../../core/domain/editor-tabs.domain-model.ts'
import { EditorTabs } from './EditorTabs.tsx'

const TABS: ReadonlyArray<EditorTab> = [
  fileTab('src/main.ts'),
  fileTab('src/checkout/quote.ts'),
  originalTab('src/checkout/quote.ts'),
]

const renderTabs = (activeKey = 'src/main.ts') => {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  render(
    <EditorTabs tabs={TABS} activeKey={activeKey} onSelect={onSelect} onClose={onClose}>
      <p>editor</p>
    </EditorTabs>
  )
  return { onSelect, onClose }
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('EditorTabs', () => {
  it('names each tab after its file and marks the active one', () => {
    renderTabs('src/checkout/quote.ts')

    expect(screen.getByRole('tablist', { name: 'Fichiers ouverts' })).toBeTruthy()
    expect(tab('main.ts').getAttribute('aria-selected')).toBe('false')
    expect(tab('quote.ts').getAttribute('aria-selected')).toBe('true')
    expect(tab('quote.ts (origine)').getAttribute('aria-selected')).toBe('false')
  })

  it('labels the panel with the active tab', () => {
    renderTabs()

    expect(screen.getByRole('tabpanel', { name: 'main.ts' }).textContent).toBe('editor')
  })

  it('selects a tab on click', () => {
    const { onSelect } = renderTabs()

    fireEvent.click(tab('quote.ts'))

    expect(onSelect).toHaveBeenCalledWith('src/checkout/quote.ts')
  })

  it('moves between tabs with the arrow keys', () => {
    const { onSelect } = renderTabs()

    fireEvent.keyDown(tab('main.ts'), { key: 'ArrowRight' })
    fireEvent.keyDown(tab('main.ts'), { key: 'ArrowLeft' })

    expect(onSelect.mock.calls).toEqual([['src/checkout/quote.ts'], ['original:src/checkout/quote.ts']])
  })

  it('closes a tab with Delete', () => {
    const { onClose } = renderTabs()

    fireEvent.keyDown(tab('main.ts'), { key: 'Delete' })

    expect(onClose).toHaveBeenCalledWith('src/main.ts')
  })

  it('closes a tab with its close button', () => {
    const { onClose } = renderTabs()

    fireEvent.click(screen.getByTitle('Fermer quote.ts (origine)'))

    expect(onClose).toHaveBeenCalledWith('original:src/checkout/quote.ts')
  })
})

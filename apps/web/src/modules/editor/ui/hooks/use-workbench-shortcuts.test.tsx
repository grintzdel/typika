import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWorkbenchShortcuts } from './use-workbench-shortcuts.ts'

const handlers = () => ({ onCloseTab: vi.fn(), onStepTab: vi.fn(), onQuickOpen: vi.fn() })

const pressOn = (target: Element, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

const elementIn = (html: string, selector: string) => {
  document.body.innerHTML = html
  return document.querySelector(selector) ?? document.body
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useWorkbenchShortcuts', () => {
  it('closes the active tab with Alt+W and keeps the key from the page', () => {
    const shortcuts = handlers()
    renderHook(() => useWorkbenchShortcuts(shortcuts))

    const event = pressOn(document.body, { key: 'w', keyCode: 87, altKey: true })

    expect(shortcuts.onCloseTab).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('opens the quick open with Ctrl+P', () => {
    const shortcuts = handlers()
    renderHook(() => useWorkbenchShortcuts(shortcuts))

    pressOn(document.body, { key: 'p', keyCode: 80, ctrlKey: true })

    expect(shortcuts.onQuickOpen).toHaveBeenCalledOnce()
  })

  it('steps through the tabs with Alt and the arrows from the editor', () => {
    const shortcuts = handlers()
    renderHook(() => useWorkbenchShortcuts(shortcuts))

    pressOn(elementIn('<div class="cm-editor"><p>code</p></div>', 'p'), { key: 'ArrowRight', altKey: true })
    pressOn(elementIn('<div data-editor-area><button>tab</button></div>', 'button'), {
      key: 'ArrowLeft',
      altKey: true,
    })

    expect(shortcuts.onStepTab.mock.calls).toEqual([[1], [-1]])
  })

  it('leaves Alt and the arrows to the tour outside of the editor', () => {
    const shortcuts = handlers()
    renderHook(() => useWorkbenchShortcuts(shortcuts))

    const event = pressOn(document.body, { key: 'ArrowRight', altKey: true })

    expect(shortcuts.onStepTab).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('does nothing while a dialog is open', () => {
    const shortcuts = handlers()
    renderHook(() => useWorkbenchShortcuts(shortcuts))

    pressOn(elementIn('<div role="dialog"><input /></div>', 'input'), { key: 'w', keyCode: 87, altKey: true })

    expect(shortcuts.onCloseTab).not.toHaveBeenCalled()
  })

  it('stops listening once unmounted', () => {
    const shortcuts = handlers()
    const { unmount } = renderHook(() => useWorkbenchShortcuts(shortcuts))
    unmount()

    pressOn(document.body, { key: 'w', keyCode: 87, altKey: true })

    expect(shortcuts.onCloseTab).not.toHaveBeenCalled()
  })
})

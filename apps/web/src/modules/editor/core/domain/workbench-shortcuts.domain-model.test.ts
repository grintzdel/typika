import { describe, expect, it } from 'vitest'

import { commandOf, WorkbenchCommand, type KeyPress } from './workbench-shortcuts.domain-model.ts'

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  keyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...modifiers,
})

describe('commandOf', () => {
  it('closes the active tab with Alt+W', () => {
    expect(commandOf(press('w', { altKey: true }), false)).toBe(WorkbenchCommand.CLOSE_TAB)
  })

  it('reads Option+W on a Mac from the key code, since the key is a typed character', () => {
    expect(commandOf({ ...press('∑', { altKey: true }), keyCode: 87 }, true)).toBe(WorkbenchCommand.CLOSE_TAB)
  })

  it('moves between tabs with Alt+arrows, and with Ctrl+Option+arrows on a Mac', () => {
    expect(commandOf(press('ArrowRight', { altKey: true }), false)).toBe(WorkbenchCommand.NEXT_TAB)
    expect(commandOf(press('ArrowLeft', { altKey: true }), false)).toBe(WorkbenchCommand.PREVIOUS_TAB)
    expect(commandOf(press('ArrowRight', { altKey: true, ctrlKey: true }), true)).toBe(WorkbenchCommand.NEXT_TAB)
  })

  it('leaves Option+arrows to the editor on a Mac, where they move by word', () => {
    expect(commandOf(press('ArrowRight', { altKey: true }), true)).toBeUndefined()
  })

  it('opens the quick open with Cmd+P on a Mac and Ctrl+P elsewhere', () => {
    expect(commandOf(press('p', { metaKey: true }), true)).toBe(WorkbenchCommand.QUICK_OPEN)
    expect(commandOf(press('p', { ctrlKey: true }), false)).toBe(WorkbenchCommand.QUICK_OPEN)
    expect(commandOf(press('p', { ctrlKey: true }), true)).toBeUndefined()
  })

  it('ignores a shortcut with an extra modifier', () => {
    expect(commandOf(press('w', { altKey: true, shiftKey: true }), false)).toBeUndefined()
    expect(commandOf(press('p', { ctrlKey: true, shiftKey: true }), false)).toBeUndefined()
  })
})

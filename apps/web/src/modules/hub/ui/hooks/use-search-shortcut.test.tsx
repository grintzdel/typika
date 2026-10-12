import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useSearchShortcut } from './use-search-shortcut.ts'

const Harness = () => {
  const searchRef = useSearchShortcut()
  return (
    <>
      <input aria-label="Search" ref={searchRef} />
      <textarea aria-label="Notes" />
      <button type="button">Elsewhere</button>
    </>
  )
}

describe('useSearchShortcut', () => {
  it('focuses the search on "/" pressed outside a field', () => {
    render(<Harness />)
    screen.getByRole('button').focus()

    const pressed = fireEvent.keyDown(screen.getByRole('button'), { key: '/' })

    expect(document.activeElement).toBe(screen.getByLabelText('Search'))
    expect(pressed).toBe(false)
  })

  it('lets "/" be typed in a field and ignores it with a modifier', () => {
    render(<Harness />)
    screen.getByLabelText('Notes').focus()

    expect(fireEvent.keyDown(screen.getByLabelText('Notes'), { key: '/' })).toBe(true)
    expect(fireEvent.keyDown(document.body, { key: '/', metaKey: true })).toBe(true)
    expect(document.activeElement).toBe(screen.getByLabelText('Notes'))
  })
})

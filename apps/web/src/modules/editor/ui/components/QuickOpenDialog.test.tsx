import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { QuickOpenDialog } from './QuickOpenDialog.tsx'

const PATHS = ['src/main.ts', 'src/checkout/quote.ts', 'src/checkout/options/standard.ts', 'tests/quote.test.ts']

const renderDialog = () => {
  const onOpen = vi.fn()
  const onOpenChange = vi.fn()
  render(<QuickOpenDialog open paths={PATHS} onOpen={onOpen} onOpenChange={onOpenChange} />)
  return { onOpen, onOpenChange, input: screen.getByRole('combobox', { name: 'Ouvrir un fichier' }) }
}

const options = () => screen.getAllByRole('option').map((option) => option.getAttribute('data-path'))

describe('QuickOpenDialog', () => {
  it('lists every file before anything is typed', () => {
    renderDialog()

    expect(options()).toEqual(PATHS)
  })

  it('narrows the list to the files that match', () => {
    const { input } = renderDialog()

    fireEvent.change(input, { target: { value: 'quote' } })

    expect(options()).toEqual(['src/checkout/quote.ts', 'tests/quote.test.ts'])
  })

  it('opens the highlighted file with Enter, moving with the arrow keys', () => {
    const { input, onOpen, onOpenChange } = renderDialog()

    fireEvent.change(input, { target: { value: 'quote' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onOpen).toHaveBeenCalledWith('tests/quote.test.ts')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('points the combobox at the highlighted option', () => {
    const { input } = renderDialog()

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    const active = screen.getAllByRole('option')[1]
    expect(active?.getAttribute('aria-selected')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(active?.id)
  })

  it('opens a file on click', () => {
    const { onOpen } = renderDialog()

    fireEvent.click(screen.getAllByRole('option')[2] as HTMLElement)

    expect(onOpen).toHaveBeenCalledWith('src/checkout/options/standard.ts')
  })

  it('says when no file matches', () => {
    const { input } = renderDialog()

    fireEvent.change(input, { target: { value: 'zzz' } })

    expect(screen.getByRole('status').textContent).toBe('Aucun fichier ne correspond.')
  })
})

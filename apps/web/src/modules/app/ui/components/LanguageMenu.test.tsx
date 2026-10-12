import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LanguageMenu } from './LanguageMenu.tsx'

describe('LanguageMenu', () => {
  it('names each language in that language, the current one selected', () => {
    render(<LanguageMenu language="fr" disabled={false} onChange={vi.fn()} />)

    const menu = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Langue' })
    expect(menu.value).toBe('fr')
    expect(screen.getByRole('option', { name: 'English' }).getAttribute('lang')).toBe('en')
  })

  it('reports the chosen language', () => {
    const onChange = vi.fn()
    render(<LanguageMenu language="fr" disabled={false} onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Langue' }), { target: { value: 'en' } })

    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('stays disabled until the page can switch languages', () => {
    render(<LanguageMenu language="en" disabled onChange={vi.fn()} />)

    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Langue' }).disabled).toBe(true)
  })
})

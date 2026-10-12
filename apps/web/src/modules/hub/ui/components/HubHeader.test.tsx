import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HubHeader } from './HubHeader.tsx'

describe('HubHeader', () => {
  it('sends a search to the templates list, without JavaScript too', () => {
    render(<HubHeader />)

    const search = screen.getByRole('searchbox', { name: 'Rechercher des templates' })
    expect(search.getAttribute('name')).toBe('q')
    expect(search.getAttribute('aria-keyshortcuts')).toBe('/')
    expect(screen.getByRole('search').getAttribute('action')).toBe('/templates')
  })

  it('reports each change of a search that the page owns, and keeps the page on submit', () => {
    const onSearch = vi.fn()
    render(<HubHeader search={{ text: 'sw', onSearch }} />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'swi' } })
    const submitted = fireEvent.submit(screen.getByRole('search'))

    expect(onSearch).toHaveBeenCalledWith('swi')
    expect(submitted).toBe(false)
  })
})

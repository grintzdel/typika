import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResultsToolbar } from './ResultsToolbar.tsx'

describe('ResultsToolbar', () => {
  it('announces the number of results and reports a new sort', () => {
    const onSort = vi.fn()
    render(<ResultsToolbar count={3} sort="relevance" canRankByRelevance onSort={onSort} />)

    expect(screen.getByRole('status').textContent).toBe('3 templates')
    fireEvent.change(screen.getByRole('combobox', { name: 'Trier par' }), { target: { value: 'updated' } })
    expect(onSort).toHaveBeenCalledWith('updated')
  })

  it('offers relevance only while searching', () => {
    render(<ResultsToolbar count={1} sort="catalogue" canRankByRelevance={false} onSort={vi.fn()} />)

    expect(screen.getByRole('status').textContent).toBe('1 template')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Ordre du catalogue',
      'Mis à jour récemment',
    ])
  })
})

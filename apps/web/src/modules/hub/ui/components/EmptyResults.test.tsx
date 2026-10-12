import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EmptyResults } from './EmptyResults.tsx'

describe('EmptyResults', () => {
  it('lists the search and the active filters with a button to remove each, and a reset', () => {
    const onRemove = vi.fn()
    const onReset = vi.fn()
    const onClearSearch = vi.fn()
    render(
      <EmptyResults
        active={[
          { facet: 'language', value: 'go' },
          { facet: 'level', value: 'beginner' },
        ]}
        text="switch"
        onRemove={onRemove}
        onClearSearch={onClearSearch}
        onReset={onReset}
      />
    )

    expect(screen.getByText('Aucun template ne correspond')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Niveau : Débutant' }))
    expect(onRemove).toHaveBeenCalledWith('level', 'beginner')
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la recherche : switch' }))
    expect(onClearSearch).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})

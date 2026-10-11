import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DiffFileHeader } from './DiffFileHeader.tsx'

const renderHeader = (steps = [{ index: 3, title: 'The context delegates' }]) => {
  const onLayoutChange = vi.fn()
  const onOpenStep = vi.fn()
  render(<DiffFileHeader layout="split" steps={steps} onLayoutChange={onLayoutChange} onOpenStep={onOpenStep} />)
  return { onLayoutChange, onOpenStep }
}

describe('DiffFileHeader', () => {
  it('switches the layout', () => {
    const { onLayoutChange } = renderHeader()

    expect(screen.getByRole('button', { name: 'Côte à côte' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Vue unifiée' }))

    expect(onLayoutChange).toHaveBeenCalledWith('unified')
  })

  it('opens a tour step anchored in the file', () => {
    const { onOpenStep } = renderHeader()

    fireEvent.click(screen.getByRole('button', { name: 'Étape 4 : The context delegates' }))

    expect(onOpenStep).toHaveBeenCalledWith(3)
  })

  it('shows no step list without anchored steps', () => {
    renderHeader([])

    expect(screen.queryByRole('list', { name: 'Étapes du tour dans ce fichier' })).toBeNull()
  })
})

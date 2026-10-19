import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SharedProjectBanner } from './SharedProjectBanner.tsx'

describe('SharedProjectBanner', () => {
  it('names the template the shared project comes from and offers to save it', () => {
    const onSave = vi.fn()
    render(<SharedProjectBanner templateName="strategy-ts" templateTitle="Strategy" isSaved={false} onSave={onSave} />)

    const banner = screen.getByRole('region', { name: 'Projet partagé' })
    expect(banner.textContent).toContain('Projet partagé, basé sur Strategy')
    expect(screen.getByRole('link', { name: 'Strategy' }).getAttribute('href')).toBe('/templates/strategy-ts')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer dans mes projets' }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('says when the shared project is saved', () => {
    render(<SharedProjectBanner templateName="strategy-ts" templateTitle="Strategy" isSaved onSave={vi.fn()} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Enregistré dans vos projets')
  })
})

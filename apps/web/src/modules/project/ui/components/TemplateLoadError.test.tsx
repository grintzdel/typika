import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TemplateLoadError } from './TemplateLoadError.tsx'

describe('TemplateLoadError', () => {
  it('explains a network failure and lets the user retry', () => {
    const onRetry = vi.fn()
    render(<TemplateLoadError failure={{ _tag: 'FilesUnavailable', name: 'strategy-ts' }} onRetry={onRetry} />)

    expect(screen.getByRole('alert').textContent).toContain('« strategy-ts » n’ont pas pu être téléchargés')
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('names the cause when the index cannot be read', () => {
    render(<TemplateLoadError failure={{ _tag: 'IndexUnavailable', failure: 'unsupported' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert').textContent).toContain('format plus récent')
  })

  it('offers no retry for a template that does not exist', () => {
    render(<TemplateLoadError failure={{ _tag: 'NotFound', name: 'missing-ts' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert').textContent).toContain('« missing-ts »')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('says when a project does not exist in this browser', () => {
    render(<TemplateLoadError failure={{ _tag: 'ProjectNotFound', id: 'missing' }} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert').textContent).toContain('Ce projet n’existe pas dans ce navigateur.')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it.each([
    ['invalid', 'Ce lien de partage est invalide.'],
    ['newer', 'Ce lien a été créé avec une version plus récente de Typika.'],
    ['origin', 'Le template de ce lien de partage est introuvable.'],
  ] as const)('explains a share link that cannot be opened (%s), with a way back', (reason, message) => {
    render(<TemplateLoadError failure={{ _tag: 'ShareInvalid', reason }} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert').textContent).toContain(message)
    expect(screen.getByRole('link', { name: 'Retour aux templates' }).getAttribute('href')).toBe('/templates')
    expect(screen.queryByRole('button')).toBeNull()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TemplateNotFound } from './TemplateNotFound.tsx'

describe('TemplateNotFound', () => {
  it('names the missing template and leads to the list', () => {
    render(<TemplateNotFound name="nope" />)

    expect(screen.getByRole('alert').textContent).toContain('Aucun template ne s’appelle « nope ».')
    expect(screen.getByRole('link', { name: 'Voir tous les templates' }).getAttribute('href')).toBe('/templates')
  })
})

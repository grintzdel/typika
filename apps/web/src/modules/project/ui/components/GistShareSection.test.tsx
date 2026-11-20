import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GistShareSection, type GistShareSectionProps } from './GistShareSection.tsx'

const LINK = { id: 'abc', url: 'https://typika.dev/g/abc', htmlUrl: 'https://gist.github.com/abc' }

const renderSection = (overrides: Partial<GistShareSectionProps> = {}) => {
  const props: GistShareSectionProps = {
    isConnected: true,
    isSharing: false,
    link: undefined,
    failure: undefined,
    revokeUrl: 'https://github.com/settings/applications',
    onConnect: vi.fn(),
    onShare: vi.fn(),
    onSignOut: vi.fn(),
    onCopy: vi.fn(),
    ...overrides,
  }
  render(<GistShareSection {...props} />)
  return props
}

describe('GistShareSection', () => {
  it('says what Typika asks GitHub for before the sign-in, and offers nothing else', () => {
    const props = renderSection({ isConnected: false })

    expect(screen.getByRole('region', { name: 'Gist GitHub' }).textContent).toContain('le droit de créer des gists')
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter à GitHub' }))
    expect(props.onConnect).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Créer le gist' })).toBeNull()
  })

  it('creates a secret gist by default, and warns that its link is enough to read it', () => {
    const props = renderSection()

    expect(screen.getByRole('region', { name: 'Gist GitHub' }).textContent).toContain('quiconque a le lien')
    fireEvent.click(screen.getByRole('button', { name: 'Créer le gist' }))
    expect(props.onShare).toHaveBeenCalledWith(false)
  })

  it('creates a public gist when the box is checked', () => {
    const props = renderSection()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Gist public' }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le gist' }))

    expect(props.onShare).toHaveBeenCalledWith(true)
  })

  it('shows the link of the gist, copies it, and offers to update the gist', () => {
    const props = renderSection({ link: LINK })

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Lien du gist' }).value).toBe(LINK.url)
    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien du gist' }))
    expect(props.onCopy).toHaveBeenCalledWith(LINK.url)
    expect(screen.getByRole('link', { name: 'Voir sur GitHub' }).getAttribute('href')).toBe(LINK.htmlUrl)
    expect(screen.getByRole('button', { name: 'Mettre à jour le gist' })).toBeDefined()
  })

  it('cannot be sent twice while GitHub answers', () => {
    renderSection({ isSharing: true })

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Envoi à GitHub…' }).disabled).toBe(true)
  })

  it('signs out, and links to the page that revokes the access', () => {
    const props = renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(props.onSignOut).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Révoquer l’accès sur GitHub' }).getAttribute('href')).toBe(
      'https://github.com/settings/applications'
    )
  })

  it.each([
    ['unauthorized', 'n’accepte plus cette session'],
    ['rate-limited', 'limite les requêtes'],
    ['unavailable', 'injoignable'],
    ['required', 'Connectez-vous'],
  ] as const)('explains a %s failure', (failure, text) => {
    renderSection({ failure })

    expect(screen.getByRole('alert').textContent).toContain(text)
  })
})

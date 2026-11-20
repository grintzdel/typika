import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GitHubCallbackStatus } from './GitHubCallbackStatus.tsx'

describe('GitHubCallbackStatus', () => {
  it('says the sign-in is in progress', () => {
    render(<GitHubCallbackStatus failure={undefined} />)

    expect(screen.getByRole('status').textContent).toBe('Connexion à GitHub…')
  })

  it.each([
    ['state', 'n’a pas commencé dans cet onglet'],
    ['denied', 'n’a pas accordé l’accès'],
    ['exchange', 'a refusé la connexion'],
    ['disabled', 'n’est pas reliée à GitHub'],
  ] as const)('explains a %s failure and links back to the templates', (failure, text) => {
    render(<GitHubCallbackStatus failure={failure} />)

    expect(screen.getByRole('alert').textContent).toContain(text)
    expect(screen.getByRole('link', { name: 'Retour aux templates' }).getAttribute('href')).toBe('/templates')
  })
})

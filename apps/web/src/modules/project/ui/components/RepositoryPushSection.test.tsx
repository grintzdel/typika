import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RepositoryPushSection, type RepositoryPushSectionProps } from './RepositoryPushSection.tsx'

const renderSection = (overrides: Partial<RepositoryPushSectionProps> = {}) => {
  const props: RepositoryPushSectionProps = {
    defaultName: 'strategy-ts',
    isConnected: true,
    isPushing: false,
    repository: undefined,
    failure: undefined,
    revokeUrl: 'https://github.com/settings/applications',
    onConnect: vi.fn(),
    onPush: vi.fn(),
    ...overrides,
  }
  render(<RepositoryPushSection {...props} />)
  return props
}

const nameField = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Nom du dépôt' })

describe('RepositoryPushSection', () => {
  it('says how wide the right is before the sign-in, and shows no form', () => {
    const props = renderSection({ isConnected: false })

    expect(screen.getByRole('region', { name: 'Dépôt GitHub' }).textContent).toContain('tous vos dépôts publics')
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter à GitHub' }))
    expect(props.onConnect).toHaveBeenCalledOnce()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('pushes with the proposed name and the Typika files by default', () => {
    const props = renderSection()

    expect(nameField().value).toBe('strategy-ts')
    fireEvent.click(screen.getByRole('button', { name: 'Créer le dépôt' }))

    expect(props.onPush).toHaveBeenCalledWith({ name: 'strategy-ts', description: '', includeTypikaFiles: true })
  })

  it('pushes what the form says', () => {
    const props = renderSection()

    fireEvent.change(nameField(), { target: { value: 'my-remix' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Description (facultative)' }), {
      target: { value: 'A remix' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Inclure les fichiers Typika/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le dépôt' }))

    expect(props.onPush).toHaveBeenCalledWith({ name: 'my-remix', description: 'A remix', includeTypikaFiles: false })
  })

  it('refuses a name GitHub would not accept', () => {
    const props = renderSection()

    fireEvent.change(nameField(), { target: { value: 'my remix' } })

    expect(nameField().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Créer le dépôt' }).disabled).toBe(true)
    expect(props.onPush).not.toHaveBeenCalled()
  })

  it('keeps the form after a failure, with its cause', () => {
    renderSection({ failure: 'name-taken' })

    expect(screen.getByRole('alert').textContent).toContain('GitHub a refusé ce nom')
    expect(nameField().value).toBe('strategy-ts')
  })

  it('links to the created repository and suggests the registry', () => {
    renderSection({
      repository: { fullName: 'octocat/strategy-ts', htmlUrl: 'https://github.com/octocat/strategy-ts' },
    })

    expect(screen.getByRole('link', { name: 'octocat/strategy-ts' }).getAttribute('href')).toBe(
      'https://github.com/octocat/strategy-ts'
    )
    expect(screen.getByRole('status').textContent).toContain('proposer au registre')
  })

  it('cannot be sent twice while GitHub answers', () => {
    renderSection({ isPushing: true })

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Envoi à GitHub…' }).disabled).toBe(true)
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShareDialog } from './ShareDialog.tsx'

const URL = 'https://typika.dev/s#1.abc'

describe('ShareDialog', () => {
  it('creates the link when opened, then shows it and copies it', async () => {
    const onOpen = vi.fn()
    const onCopy = vi.fn()
    render(<ShareDialog link={{ _tag: 'Ready', url: URL }} isCopied={false} onOpen={onOpen} onCopy={onCopy} />)

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    const dialog = await screen.findByRole('dialog', { name: 'Partager le projet' })

    expect(onOpen).toHaveBeenCalledOnce()
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Lien de partage' }).value).toBe(URL)
    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien' }))
    expect(onCopy).toHaveBeenCalledWith(URL)
    expect(dialog.textContent).toContain('ne quitte pas votre navigateur')
  })

  it('confirms the copy', async () => {
    render(<ShareDialog link={{ _tag: 'Ready', url: URL }} isCopied onOpen={vi.fn()} onCopy={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))

    expect((await screen.findByRole('status')).textContent).toBe('Lien copié')
  })

  it('explains why a project too large has no link', async () => {
    render(
      <ShareDialog
        link={{ _tag: 'TooLong', length: 12_345, max: 8_000 }}
        isCopied={false}
        onOpen={vi.fn()}
        onCopy={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    const dialog = await screen.findByRole('dialog', { name: 'Partager le projet' })

    expect(dialog.textContent).toContain('trop volumineux')
    expect(dialog.textContent).toMatch(/12\s345.*8\s000/)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('waits for the link while it is created', async () => {
    render(<ShareDialog link={undefined} isCopied={false} onOpen={vi.fn()} onCopy={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))

    expect((await screen.findByRole('dialog')).textContent).toContain('Création du lien…')
  })

  it('offers a gist under the link when the instance is connected to GitHub', async () => {
    const onShare = vi.fn()
    render(
      <ShareDialog
        link={{ _tag: 'TooLong', length: 12_345, max: 8_000 }}
        isCopied={false}
        onOpen={vi.fn()}
        onCopy={vi.fn()}
        gist={{
          isConnected: true,
          isSharing: false,
          link: undefined,
          failure: undefined,
          revokeUrl: undefined,
          onConnect: vi.fn(),
          onShare,
          onSignOut: vi.fn(),
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    const dialog = await screen.findByRole('dialog', { name: 'Partager le projet' })

    expect(dialog.textContent).toContain('Partagez-le plutôt par un gist.')
    fireEvent.click(screen.getByRole('button', { name: 'Créer le gist' }))
    expect(onShare).toHaveBeenCalledWith(false)
  })

  it('has no gist section on an instance without GitHub', async () => {
    render(<ShareDialog link={{ _tag: 'Ready', url: URL }} isCopied={false} onOpen={vi.fn()} onCopy={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    await screen.findByRole('dialog', { name: 'Partager le projet' })

    expect(screen.queryByRole('region', { name: 'Gist GitHub' })).toBeNull()
  })

  it('opens by itself after a sign-in, and creates the link once', async () => {
    const onOpen = vi.fn()
    const { rerender } = render(
      <ShareDialog link={undefined} isCopied={false} onOpen={onOpen} onCopy={vi.fn()} defaultOpen />
    )

    await screen.findByRole('dialog', { name: 'Partager le projet' })
    rerender(<ShareDialog link={undefined} isCopied={false} onOpen={onOpen} onCopy={vi.fn()} defaultOpen />)

    expect(onOpen).toHaveBeenCalledOnce()
  })
})

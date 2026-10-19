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
})

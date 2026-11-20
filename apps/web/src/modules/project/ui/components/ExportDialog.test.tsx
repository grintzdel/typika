import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ExportDialog } from './ExportDialog.tsx'

const open = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Exporter' }))
  return screen.findByRole('dialog', { name: 'Exporter le projet' })
}

describe('ExportDialog', () => {
  it('exports with the Typika files by default', async () => {
    const onExport = vi.fn()
    render(<ExportDialog onExport={onExport} />)

    await open()
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: /Inclure les fichiers Typika/ }).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le zip' }))

    expect(onExport).toHaveBeenCalledWith(true)
  })

  it('exports without the Typika files when unchecked', async () => {
    const onExport = vi.fn()
    render(<ExportDialog onExport={onExport} />)

    await open()
    fireEvent.click(screen.getByRole('checkbox', { name: /Inclure les fichiers Typika/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le zip' }))

    expect(onExport).toHaveBeenCalledWith(false)
  })

  it('offers to create a GitHub repository when the instance is connected to GitHub', async () => {
    const onPush = vi.fn()
    render(
      <ExportDialog
        onExport={vi.fn()}
        repository={{
          defaultName: 'strategy-ts',
          isConnected: true,
          isPushing: false,
          repository: undefined,
          failure: undefined,
          revokeUrl: undefined,
          onConnect: vi.fn(),
          onPush,
        }}
      />
    )

    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Créer le dépôt' }))

    expect(onPush).toHaveBeenCalledWith({ name: 'strategy-ts', description: '', includeTypikaFiles: true })
  })

  it('has no repository section on an instance without GitHub', async () => {
    render(<ExportDialog onExport={vi.fn()} />)

    await open()

    expect(screen.queryByRole('region', { name: 'Dépôt GitHub' })).toBeNull()
  })

  it('opens by itself after a sign-in, and says it has resumed', async () => {
    const onResumed = vi.fn()
    render(<ExportDialog onExport={vi.fn()} defaultOpen onResumed={onResumed} />)

    await screen.findByRole('dialog', { name: 'Exporter le projet' })

    expect(onResumed).toHaveBeenCalled()
  })
})

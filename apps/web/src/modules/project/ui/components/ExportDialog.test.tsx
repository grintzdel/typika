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
})

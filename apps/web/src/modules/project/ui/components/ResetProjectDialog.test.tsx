import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResetProjectDialog } from './ResetProjectDialog.tsx'

const renderDialog = (modifiedPaths: ReadonlyArray<string>) => {
  const onConfirm = vi.fn()
  render(<ResetProjectDialog modifiedPaths={modifiedPaths} onConfirm={onConfirm} />)
  return { onConfirm }
}

const trigger = () => screen.getByRole('button', { name: 'Réinitialiser' })

describe('ResetProjectDialog', () => {
  it('cannot be opened while nothing is modified', () => {
    renderDialog([])

    expect(trigger().hasAttribute('disabled')).toBe(true)
  })

  it('lists the modified files before resetting', async () => {
    renderDialog(['src/a.ts', 'src/b.ts'])

    fireEvent.click(trigger())

    const dialog = await screen.findByRole('alertdialog', { name: 'Réinitialiser le projet ?' })
    expect([...dialog.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['src/a.ts', 'src/b.ts'])
  })

  it('resets once confirmed', async () => {
    const { onConfirm } = renderDialog(['src/a.ts'])
    fireEvent.click(trigger())
    const dialog = await screen.findByRole('alertdialog')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Réinitialiser' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('keeps the project when cancelled', async () => {
    const { onConfirm } = renderDialog(['src/a.ts'])
    fireEvent.click(trigger())
    const dialog = await screen.findByRole('alertdialog')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

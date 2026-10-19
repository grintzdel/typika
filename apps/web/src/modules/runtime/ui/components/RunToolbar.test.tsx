import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RunToolbar, type RunToolbarProps } from './RunToolbar.tsx'

const renderToolbar = (props: Partial<RunToolbarProps> = {}) => {
  const handlers = { onRun: vi.fn(), onTest: vi.fn(), onStop: vi.fn(), onRetry: vi.fn() }
  render(
    <RunToolbar
      status="ready"
      bootError={undefined}
      download={undefined}
      isRunning={false}
      isTesting={false}
      {...handlers}
      {...props}
    />
  )
  return handlers
}

describe('RunToolbar', () => {
  it('explains a runtime this instance does not provide, with nothing to retry', () => {
    renderToolbar({ status: 'unsupported' })

    expect(screen.getByRole('status').textContent).toContain('Cette instance n’exécute pas ce langage')
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull()
    expect(screen.getByRole('button', { name: /Exécuter/ }).hasAttribute('disabled')).toBe(true)
  })

  it('lets a runtime that has not started yet start on the first click', () => {
    const { onRun, onTest } = renderToolbar({ status: 'idle' })

    fireEvent.click(screen.getByRole('button', { name: /Exécuter/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tests/ }))

    expect(onRun).toHaveBeenCalledOnce()
    expect(onTest).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('offers no run under a page that is not served over HTTPS, and says why', () => {
    renderToolbar({ status: 'insecure' })

    expect(screen.getByRole('status').textContent).toContain('HTTPS')
    expect(screen.queryByRole('button', { name: /Exécuter/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Tests/ })).toBeNull()
  })

  it('shows the download of the runtime while it loads', () => {
    renderToolbar({ status: 'loading', download: { loadedBytes: 4_200_000, totalBytes: 79_315_000 } })

    const bar = screen.getByRole('progressbar', { name: 'Téléchargement du runtime' })
    expect(bar.getAttribute('value')).toBe('4200000')
    expect(bar.getAttribute('max')).toBe('79315000')
    expect(screen.getByText('4,2 / 79,3 Mo')).toBeTruthy()
  })

  it('hides the download once the runtime is ready', () => {
    renderToolbar({ download: { loadedBytes: 2, totalBytes: 2 } })

    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('offers to stop a running program', () => {
    const { onStop } = renderToolbar({ isRunning: true })

    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }))

    expect(onStop).toHaveBeenCalledOnce()
  })

  it('offers no stop when nothing runs', () => {
    renderToolbar()

    expect(screen.queryByRole('button', { name: 'Arrêter' })).toBeNull()
  })
})

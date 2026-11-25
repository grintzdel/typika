import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkbenchLayout, type PanelSizes } from './WorkbenchLayout.tsx'

const LABELS = { sidebar: 'Resize the files', aside: 'Resize the side panel', bottom: 'Resize the bottom panel' }
const SIZES: PanelSizes = { sidebar: 240, aside: 400, bottom: 200 }

const renderLayout = ({ sizes = SIZES, withAside = true } = {}) => {
  const onResize = vi.fn()
  const { container } = render(
    <WorkbenchLayout
      toolbar={<p>toolbar</p>}
      sidebar={<p>files</p>}
      main={<p>editor</p>}
      aside={withAside ? <p>tour</p> : undefined}
      bottom={<p>console</p>}
      sizes={sizes}
      resizeLabels={LABELS}
      onResize={onResize}
    />
  )
  const grid = container.firstElementChild
  if (!(grid instanceof HTMLElement)) throw new Error('The layout renders no grid')
  return { onResize, grid }
}

const separator = (name: string) => screen.getByRole('separator', { name })

describe('WorkbenchLayout', () => {
  it('exposes a labelled separator for each panel, with its size', () => {
    renderLayout()

    expect(separator(LABELS.sidebar).getAttribute('aria-valuenow')).toBe('240')
    expect(separator(LABELS.sidebar).getAttribute('aria-orientation')).toBe('vertical')
    expect(separator(LABELS.aside).getAttribute('aria-valuenow')).toBe('400')
    expect(separator(LABELS.bottom).getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('has no side panel separator without a side panel', () => {
    renderLayout({ withAside: false })

    expect(screen.queryByRole('separator', { name: LABELS.aside })).toBeNull()
  })

  it('sizes the columns and the bottom row from the sizes', () => {
    const { grid } = renderLayout()

    expect(grid.style.gridTemplateColumns).toBe('240px 0px 1fr 0px 400px')
    expect(grid.style.gridTemplateRows).toBe('auto 1fr 0px 200px')
  })

  it('widens the file tree with the right arrow, by a larger step with Shift', () => {
    const { onResize } = renderLayout()

    fireEvent.keyDown(separator(LABELS.sidebar), { key: 'ArrowRight' })
    fireEvent.keyDown(separator(LABELS.sidebar), { key: 'ArrowRight', shiftKey: true })

    expect(onResize.mock.calls).toEqual([
      ['sidebar', 256],
      ['sidebar', 304],
    ])
  })

  it('widens the side panel with the left arrow and raises the bottom panel with the up arrow', () => {
    const { onResize } = renderLayout()

    fireEvent.keyDown(separator(LABELS.aside), { key: 'ArrowLeft' })
    fireEvent.keyDown(separator(LABELS.bottom), { key: 'ArrowUp' })

    expect(onResize.mock.calls).toEqual([
      ['aside', 416],
      ['bottom', 216],
    ])
  })

  it('keeps a panel within its bounds', () => {
    const { onResize } = renderLayout({ sizes: { ...SIZES, sidebar: 480 } })

    fireEvent.keyDown(separator(LABELS.sidebar), { key: 'ArrowRight' })
    fireEvent.keyDown(separator(LABELS.sidebar), { key: 'Home' })

    expect(onResize.mock.calls).toEqual([
      ['sidebar', 480],
      ['sidebar', 160],
    ])
  })

  it('resizes the file tree by dragging its separator, until the pointer is released', () => {
    const { onResize } = renderLayout()

    fireEvent.pointerDown(separator(LABELS.sidebar), { pointerId: 1, button: 0, clientX: 100, clientY: 10 })
    fireEvent.pointerMove(separator(LABELS.sidebar), { pointerId: 1, clientX: 160, clientY: 10 })
    fireEvent.pointerUp(separator(LABELS.sidebar), { pointerId: 1, clientX: 160, clientY: 10 })
    fireEvent.pointerMove(separator(LABELS.sidebar), { pointerId: 1, clientX: 400, clientY: 10 })

    expect(onResize.mock.calls).toEqual([['sidebar', 300]])
  })

  it('narrows the side panel when its separator is dragged to the right', () => {
    const { onResize } = renderLayout()

    fireEvent.pointerDown(separator(LABELS.aside), { pointerId: 1, button: 0, clientX: 900, clientY: 10 })
    fireEvent.pointerMove(separator(LABELS.aside), { pointerId: 1, clientX: 950, clientY: 10 })

    expect(onResize.mock.calls).toEqual([['aside', 350]])
  })
})

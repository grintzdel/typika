import { act, fireEvent, renderHook } from '@testing-library/react'
import type { TourStep } from '@typika/manifest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TourAnchor } from '../../core/domain/tour.domain-model.ts'
import { useTour } from './use-tour.ts'

const step = (id: string, title: string): TourStep => ({ path: `tour/${id}.md`, id, title, also: [], body: '' })

const STEPS = [step('overview', 'Overview'), step('context', 'The context'), step('trade-offs', 'Trade-offs')]
const ANCHOR: TourAnchor = { _tag: 'TextOnly' }

const renderTour = (steps: ReadonlyArray<TourStep> = STEPS) => {
  const onOpen = vi.fn()
  const hook = renderHook(() => useTour({ steps, anchorOf: () => ANCHOR, onOpen }))
  return { ...hook, onOpen }
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useTour', () => {
  it('opens the first step without announcing it', () => {
    const { result, onOpen } = renderTour()

    expect(result.current.index).toBe(0)
    expect(result.current.announcement).toBe('')
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(STEPS[0], ANCHOR)
  })

  it('opens the step named in the URL', () => {
    window.history.replaceState(null, '', '/#step=context')

    const { result, onOpen } = renderTour()

    expect(result.current.index).toBe(1)
    expect(onOpen).toHaveBeenCalledWith(STEPS[1], ANCHOR)
  })

  it('waits for the steps', () => {
    const { result, onOpen } = renderTour([])

    expect(result.current.step).toBeUndefined()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('opens a step, writes it in the URL and announces it', () => {
    const { result, onOpen } = renderTour()

    act(() => result.current.handleSelect(2))

    expect(result.current.index).toBe(2)
    expect(window.location.hash).toBe('#step=trade-offs')
    expect(result.current.announcement).toBe('Étape 3 sur 3 : Trade-offs')
    expect(onOpen).toHaveBeenLastCalledWith(STEPS[2], ANCHOR)
  })

  it('ignores a step out of the tour', () => {
    const { result } = renderTour()

    act(() => result.current.handleSelect(3))

    expect(result.current.index).toBe(0)
  })

  it('moves with Alt and the arrow keys', () => {
    const { result } = renderTour()

    act(() => {
      fireEvent.keyDown(document.body, { key: 'ArrowRight', altKey: true })
      fireEvent.keyDown(document.body, { key: 'ArrowRight', altKey: true })
      fireEvent.keyDown(document.body, { key: 'ArrowLeft', altKey: true })
    })

    expect(result.current.index).toBe(1)
  })

  it('leaves Alt and the arrow keys to the editor', () => {
    const { result } = renderTour()
    const editor = document.createElement('div')
    editor.className = 'cm-editor'
    const content = document.createElement('div')
    editor.append(content)
    document.body.append(editor)

    act(() => {
      fireEvent.keyDown(content, { key: 'ArrowRight', altKey: true })
    })

    expect(result.current.index).toBe(0)
    editor.remove()
  })
})

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { hashOfStep, stepIndexFromHash, type TourStepRef } from '../../core/domain/tour.domain-model.ts'

export type UseTourOptions<S extends TourStepRef, A> = {
  readonly steps: ReadonlyArray<S>
  readonly anchorOf: (step: S) => A
  readonly onOpen: (step: S, anchor: A) => void
}

type OpenedStep<A> = { readonly index: number; readonly anchor: A; readonly announced: boolean }

const KEEPS_ARROW_KEYS = '.cm-editor, input, textarea, select, [contenteditable="true"]'

const keepsArrowKeys = (target: EventTarget | null) =>
  target instanceof Element && target.closest(KEEPS_ARROW_KEYS) !== null

export const useTour = <S extends TourStepRef, A>({ steps, anchorOf, onOpen }: UseTourOptions<S, A>) => {
  const { t } = useTranslation('tour')
  const [opened, setOpened] = useState<OpenedStep<A> | undefined>(undefined)

  const open = (index: number, announced: boolean) => {
    const step = steps[index]
    if (step === undefined) return
    const anchor = anchorOf(step)
    setOpened({ index, anchor, announced })
    onOpen(step, anchor)
  }

  if (opened === undefined && steps.length > 0) open(stepIndexFromHash(window.location.hash, steps), false)

  const handleSelect = (index: number) => {
    const step = steps[index]
    if (step === undefined) return
    open(index, true)
    window.history.replaceState(window.history.state, '', `#${hashOfStep(step)}`)
  }

  const index = opened?.index ?? 0
  const latest = useRef({ index, handleSelect })

  useEffect(() => {
    latest.current = { index, handleSelect }
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || keepsArrowKeys(event.target)) return
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
      event.preventDefault()
      latest.current.handleSelect(latest.current.index + (event.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const step = opened === undefined ? undefined : steps[opened.index]

  return {
    step,
    index,
    anchor: opened?.anchor,
    announcement:
      step === undefined || opened?.announced !== true
        ? ''
        : t('announcement', { current: index + 1, total: steps.length, title: step.title }),
    handleSelect,
  }
}

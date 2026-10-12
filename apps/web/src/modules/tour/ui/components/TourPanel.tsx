import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'

export type TourPanelStep = { readonly id: string; readonly title: string }

export type TourPanelProps = {
  readonly steps: ReadonlyArray<TourPanelStep>
  readonly index: number
  readonly announcement: string
  readonly onSelect: (index: number) => void
  readonly children: ReactNode
}

export const TourPanel = ({ steps, index, announcement, onSelect, children }: TourPanelProps) => {
  const { t } = useTranslation('tour')
  const step = steps[index]
  if (step === undefined) return null

  return (
    <section aria-label={t('label')} className="flex h-full min-h-0 flex-col text-sm">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {t('progress', { current: index + 1, total: steps.length })}
        </p>
        <h2 className="mt-1 text-base font-semibold">{step.title}</h2>
      </header>
      <div key={step.id} className="min-h-0 flex-1 overflow-auto px-4">
        {children}
      </div>
      <div className="flex justify-between gap-2 border-t border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <Button aria-label={t('previousLabel')} disabled={index === 0} onClick={() => onSelect(index - 1)}>
          <span aria-hidden="true">←</span> {t('previous')}
        </Button>
        <Button aria-label={t('nextLabel')} disabled={index === steps.length - 1} onClick={() => onSelect(index + 1)}>
          {t('next')} <span aria-hidden="true">→</span>
        </Button>
      </div>
      <ol
        aria-label={t('steps')}
        className="max-h-[40%] shrink-0 list-inside list-decimal overflow-auto border-t border-neutral-200 px-2 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
      >
        {steps.map((item, itemIndex) => (
          <li key={item.id} className="rounded px-2 marker:text-xs">
            <button
              type="button"
              aria-current={itemIndex === index ? 'step' : undefined}
              className="py-0.5 text-left hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-sky-600 aria-[current=step]:font-semibold aria-[current=step]:text-neutral-900 dark:hover:text-neutral-100 dark:aria-[current=step]:text-neutral-100"
              onClick={() => onSelect(itemIndex)}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

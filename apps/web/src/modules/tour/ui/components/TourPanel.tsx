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
    <section aria-label={t('label')} className="flex h-full min-h-0 flex-col text-compact">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <header className="border-b border-border px-4 py-3">
        <p className="text-sm text-fg-muted">{t('progress', { current: index + 1, total: steps.length })}</p>
        <h2 className="mt-1 text-base font-semibold">{step.title}</h2>
      </header>
      <div key={step.id} className="min-h-0 flex-1 overflow-auto px-4">
        {children}
      </div>
      <div className="flex justify-between gap-2 border-t border-border px-4 py-2">
        <Button aria-label={t('previousLabel')} disabled={index === 0} onClick={() => onSelect(index - 1)}>
          <span aria-hidden="true">←</span> {t('previous')}
        </Button>
        <Button aria-label={t('nextLabel')} disabled={index === steps.length - 1} onClick={() => onSelect(index + 1)}>
          {t('next')} <span aria-hidden="true">→</span>
        </Button>
      </div>
      <ol
        aria-label={t('steps')}
        className="max-h-[40%] shrink-0 list-inside list-decimal overflow-auto border-t border-border px-2 py-2 text-fg-muted"
      >
        {steps.map((item, itemIndex) => (
          <li key={item.id} className="rounded-sm px-2 marker:text-sm">
            <button
              type="button"
              aria-current={itemIndex === index ? 'step' : undefined}
              className="py-0.5 text-left hover:text-fg aria-[current=step]:font-semibold aria-[current=step]:text-fg"
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

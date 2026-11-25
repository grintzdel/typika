import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { DiffLayout } from './DiffEditor.tsx'

export type DiffFileHeaderProps = {
  readonly layout: DiffLayout
  readonly steps: ReadonlyArray<{ readonly index: number; readonly title: string }>
  readonly onLayoutChange: (layout: DiffLayout) => void
  readonly onOpenStep: (index: number) => void
}

export const DiffFileHeader = ({ layout, steps, onLayoutChange, onOpenStep }: DiffFileHeaderProps) => {
  const { t } = useTranslation('diff')

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-compact">
      <div role="group" aria-label={t('layout.label')} className="flex gap-1">
        <Button aria-pressed={layout === DiffLayout.SPLIT} onClick={() => onLayoutChange(DiffLayout.SPLIT)}>
          {t('layout.split')}
        </Button>
        <Button aria-pressed={layout === DiffLayout.UNIFIED} onClick={() => onLayoutChange(DiffLayout.UNIFIED)}>
          {t('layout.unified')}
        </Button>
      </div>
      {steps.length > 0 ? (
        <ul aria-label={t('steps')} className="ml-auto flex flex-wrap gap-1">
          {steps.map((step) => (
            <li key={step.index}>
              <button
                type="button"
                aria-label={t('step', { number: step.index + 1, title: step.title })}
                className="inline-flex min-h-target items-center rounded-full border border-warning-border bg-warning-bg px-3 text-warning-fg hover:border-modified"
                onClick={() => onOpenStep(step.index)}
              >
                {step.index + 1}. {step.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

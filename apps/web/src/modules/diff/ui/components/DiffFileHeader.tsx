import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { DiffLayout } from './DiffEditor.tsx'

export type DiffFileHeaderProps = {
  readonly layout: DiffLayout
  readonly steps: ReadonlyArray<{ readonly index: number; readonly title: string }>
  readonly onLayoutChange: (layout: DiffLayout) => void
  readonly onOpenStep: (index: number) => void
}

const PRESSED =
  'aria-pressed:bg-sky-100 aria-pressed:text-sky-950 dark:aria-pressed:bg-sky-950 dark:aria-pressed:text-sky-100'

export const DiffFileHeader = ({ layout, steps, onLayoutChange, onOpenStep }: DiffFileHeaderProps) => {
  const { t } = useTranslation('diff')

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-800">
      <div role="group" aria-label={t('layout.label')} className="flex gap-1">
        <Button
          aria-pressed={layout === DiffLayout.SPLIT}
          className={PRESSED}
          onClick={() => onLayoutChange(DiffLayout.SPLIT)}
        >
          {t('layout.split')}
        </Button>
        <Button
          aria-pressed={layout === DiffLayout.UNIFIED}
          className={PRESSED}
          onClick={() => onLayoutChange(DiffLayout.UNIFIED)}
        >
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
                className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-sky-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
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

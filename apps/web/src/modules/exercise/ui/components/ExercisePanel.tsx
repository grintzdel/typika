import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ConfirmButton } from '../../../../ui/ConfirmButton.tsx'
import { ContentMarkdown } from '../../../shared/ui/components/ContentMarkdown.tsx'
import type { TargetProgress } from '../../core/domain/exercise-progress.domain-model.ts'

export type ExercisePanelProps = {
  readonly exercise: {
    readonly name: string
    readonly kind: string
    readonly title: string
    readonly readme: string
    readonly failing: ReadonlyArray<string>
    readonly hints: ReadonlyArray<string>
  }
  readonly progress: TargetProgress | undefined
  readonly isSolved: boolean
  readonly next: { readonly kind: 'exercise' | 'template'; readonly href: string }
  readonly revealedHints: number
  readonly embeddedTemplates: ReadonlyArray<string>
  readonly onRevealHint: () => void
  readonly onShowSolution: () => void
  readonly onApplySolution: () => void
}

const README_TITLE = /^#\s.*\n+/

export const ExercisePanel = ({
  exercise,
  progress,
  isSolved,
  next,
  revealedHints,
  embeddedTemplates,
  onRevealHint,
  onShowSolution,
  onApplySolution,
}: ExercisePanelProps) => {
  const { t } = useTranslation('exercise')

  return (
    <section aria-label={t('label')} className="flex h-full min-h-0 flex-col text-sm">
      <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">
          {exercise.kind}
        </span>
        <h2 className="mt-1 text-base font-semibold">{exercise.title}</h2>
        <p className="mt-1 text-neutral-700 dark:text-neutral-300">
          {progress === undefined ? t('notRun') : t('progress', progress)}
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-4">
        {isSolved ? (
          <div className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-green-950 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
            <p className="font-semibold">{t('solved')}</p>
            <a
              href={next.href}
              className="mt-1 inline-block text-sky-700 underline underline-offset-2 dark:text-sky-400"
            >
              {next.kind === 'exercise' ? t('next') : t('backToTemplate')}
            </a>
          </div>
        ) : null}
        <ContentMarkdown markdown={exercise.readme.replace(README_TITLE, '')} embeddedTemplates={embeddedTemplates} />
        <h3 className="mt-4 mb-1 font-semibold">{t('targets')}</h3>
        <ul aria-label={t('targets')} className="font-mono text-xs">
          {exercise.failing.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
        {exercise.hints.slice(0, revealedHints).map((hint, index) => (
          <div
            key={index}
            className="mt-3 rounded border border-sky-200 bg-sky-50 px-3 dark:border-sky-900 dark:bg-sky-950"
          >
            <h3 className="mt-2 font-semibold">{t('hintTitle', { number: index + 1 })}</h3>
            <ContentMarkdown markdown={hint} embeddedTemplates={embeddedTemplates} />
          </div>
        ))}
        {revealedHints < exercise.hints.length ? (
          <Button className="mt-3" onClick={onRevealHint}>
            {t('hint', { current: revealedHints + 1, total: exercise.hints.length })}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <ConfirmButton
          title={t('showSolutionTitle')}
          description={t('showSolutionDescription')}
          confirm={t('showSolution')}
          cancel={t('cancel')}
          onConfirm={onShowSolution}
        >
          {t('showSolution')}
        </ConfirmButton>
        <ConfirmButton
          title={t('applySolutionTitle')}
          description={t('applySolutionDescription')}
          confirm={t('applySolution')}
          cancel={t('cancel')}
          onConfirm={onApplySolution}
        >
          {t('applySolution')}
        </ConfirmButton>
      </div>
    </section>
  )
}

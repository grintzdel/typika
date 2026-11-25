import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ConfirmButton } from '../../../../ui/ConfirmButton.tsx'
import { StatusGlyph } from '../../../../ui/StatusGlyph.tsx'
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
    <section aria-label={t('label')} className="flex h-full min-h-0 flex-col text-compact">
      <header className="border-b border-border px-4 py-3">
        <span className="rounded-full bg-surface-muted px-3 py-0.5 font-mono text-sm">{exercise.kind}</span>
        <h2 className="mt-1 text-base font-semibold">{exercise.title}</h2>
        <p className="mt-1 text-fg-muted">{progress === undefined ? t('notRun') : t('progress', progress)}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-4">
        {isSolved ? (
          <div className="mt-3 flex gap-2 rounded-sm border border-success-border bg-success-bg p-3 text-success-fg">
            <StatusGlyph tone="success" />
            <div>
              <p className="font-semibold">{t('solved')}</p>
              <a
                href={next.href}
                className="mt-1 inline-block text-link underline underline-offset-2 hover:text-link-hover"
              >
                {next.kind === 'exercise' ? t('next') : t('backToTemplate')}
              </a>
            </div>
          </div>
        ) : null}
        <ContentMarkdown markdown={exercise.readme.replace(README_TITLE, '')} embeddedTemplates={embeddedTemplates} />
        <h3 className="mt-4 mb-1 font-semibold">{t('targets')}</h3>
        <ul aria-label={t('targets')} className="font-mono text-sm">
          {exercise.failing.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
        {exercise.hints.slice(0, revealedHints).map((hint, index) => (
          <div key={index} className="mt-3 flex gap-2 rounded-sm border border-info-border bg-info-bg px-3">
            <div className="mt-2">
              <StatusGlyph tone="info" />
            </div>
            <div className="min-w-0">
              <h3 className="mt-2 font-semibold">{t('hintTitle', { number: index + 1 })}</h3>
              <ContentMarkdown markdown={hint} embeddedTemplates={embeddedTemplates} />
            </div>
          </div>
        ))}
        {revealedHints < exercise.hints.length ? (
          <Button className="mt-3" onClick={onRevealHint}>
            {t('hint', { current: revealedHints + 1, total: exercise.hints.length })}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
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

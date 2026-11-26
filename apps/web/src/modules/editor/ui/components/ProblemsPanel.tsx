import { useTranslation } from 'react-i18next'

import { StatusGlyph, type StatusTone } from '../../../../ui/StatusGlyph.tsx'
import type { Problem } from '../../core/domain/problems.domain-model.ts'

const TONES: Readonly<Record<Problem['severity'], StatusTone>> = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
}

const COLORS: Readonly<Record<Problem['severity'], string>> = {
  error: 'text-danger-text',
  warning: 'text-warning-text',
  info: 'text-fg-muted',
}

export type ProblemsPanelProps = {
  readonly problems: ReadonlyArray<Problem>
  readonly onOpen: (problem: Problem) => void
}

export const ProblemsPanel = ({ problems, onOpen }: ProblemsPanelProps) => {
  const { t } = useTranslation('editor')
  return (
    <section aria-label={t('problems.label')} className="h-full p-3 text-compact">
      {problems.length === 0 ? (
        <p className="text-fg-muted">{t('problems.empty')}</p>
      ) : (
        [...Map.groupBy(problems, (problem) => problem.path)].map(([path, found]) => (
          <div key={path} className="mb-3">
            <h3 className="font-mono text-sm text-fg-muted">{path}</h3>
            <ul>
              {found.map((problem) => (
                <li key={`${problem.from}:${problem.message}`}>
                  <button
                    type="button"
                    aria-label={t('problems.item', {
                      severity: t(`problems.severity.${problem.severity}`),
                      path,
                      line: problem.line,
                      column: problem.column,
                      message: problem.message,
                    })}
                    className="flex min-h-target w-full items-center gap-3 rounded-sm px-2 text-left hover:bg-surface-muted"
                    onClick={() => onOpen(problem)}
                  >
                    <span className={COLORS[problem.severity]}>
                      <StatusGlyph tone={TONES[problem.severity]} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{problem.message}</span>
                    <span className="shrink-0 text-sm text-fg-subtle tabular-nums">
                      {t('problems.position', { line: problem.line, column: problem.column })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

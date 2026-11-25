import { useTranslation } from 'react-i18next'

import type { ConsoleOutcome, ConsoleState } from '../../core/domain/console.domain-model.ts'

export type ConsolePanelProps = {
  readonly console: ConsoleState | undefined
}

const STREAM_CLASS = {
  stdout: '',
  stderr: 'text-danger-text',
  diagnostic: 'text-warning-text',
} as const

const useOutcomeText = () => {
  const { t } = useTranslation('runtime')
  return (outcome: ConsoleOutcome) => {
    switch (outcome._tag) {
      case 'Running':
        return t('console.running')
      case 'Exited':
        return t('console.exited', { code: outcome.code })
      case 'Interrupted':
        return t('console.interrupted')
      case 'CompileFailed':
        return t('console.compileFailed')
      case 'TimedOut':
        return t('console.timedOut', { seconds: Math.round(outcome.limitMs / 1000) })
      case 'CompilerBusy':
        return t('console.compilerBusy', { seconds: outcome.retryAfterSeconds })
      case 'CompilerUnavailable':
        return t('console.compilerUnavailable')
      default:
        return t('console.crashed', { message: outcome.message })
    }
  }
}

export const ConsolePanel = ({ console }: ConsolePanelProps) => {
  const { t } = useTranslation('runtime')
  const outcomeText = useOutcomeText()
  return (
    <section aria-label={t('console.label')} className="h-full p-3 font-mono text-compact">
      {console === undefined ? (
        <p className="font-sans text-fg-muted">{t('console.empty')}</p>
      ) : (
        <>
          {console.truncated ? <p className="mb-2 font-sans text-sm text-fg-subtle">{t('console.truncated')}</p> : null}
          <pre className="whitespace-pre-wrap">
            {console.entries.map((entry, index) => (
              <span key={index} className={STREAM_CLASS[entry.stream]}>
                {entry.stream === 'diagnostic' ? `${entry.text}\n` : entry.text}
              </span>
            ))}
          </pre>
          <p role="status" className="mt-2 font-sans text-sm text-fg-muted">
            {outcomeText(console.outcome)}
          </p>
        </>
      )}
    </section>
  )
}

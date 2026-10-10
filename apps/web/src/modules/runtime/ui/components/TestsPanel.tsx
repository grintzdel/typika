import { useTranslation } from 'react-i18next'

import { formatDiagnostic } from '../../core/domain/console.domain-model.ts'
import type { TestResult, TestRunOutcome, TestRunState } from '../../core/domain/test-run.domain-model.ts'

export type TestsPanelProps = {
  readonly run: TestRunState | undefined
}

const STATUS_STYLE = {
  passed: { icon: '✓', className: 'text-emerald-700 dark:text-emerald-400' },
  failed: { icon: '✕', className: 'text-red-700 dark:text-red-400' },
  skipped: { icon: '○', className: 'text-neutral-500' },
} as const

const groupByFile = (tests: ReadonlyArray<TestResult>) => {
  const groups = new Map<string, Array<TestResult>>()
  for (const test of tests) groups.set(test.file, [...(groups.get(test.file) ?? []), test])
  return [...groups]
}

const locationOf = (test: TestResult) => {
  const location = test.failure?.location
  if (location === undefined) return undefined
  return location.column === undefined
    ? `${location.file}:${location.line}`
    : `${location.file}:${location.line}:${location.column}`
}

const TestItem = ({ test }: { readonly test: TestResult }) => {
  const { t } = useTranslation('runtime')
  const style = STATUS_STYLE[test.status]
  const location = locationOf(test)
  return (
    <li className="py-1">
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" className={style.className}>
          {style.icon}
        </span>
        <span className="sr-only">{t(`tests.status.${test.status}`)}</span>
        <span>{[...test.suitePath, test.name].join(' › ')}</span>
        {test.durationMs === undefined ? null : (
          <span className="text-xs text-neutral-500">{Math.round(test.durationMs)} ms</span>
        )}
      </div>
      {test.failure === undefined ? null : (
        <div className="mt-1 ml-5 space-y-1">
          <pre className="font-mono text-xs whitespace-pre-wrap text-red-800 dark:text-red-300">
            {test.failure.message}
          </pre>
          {location === undefined ? null : <p className="font-mono text-xs text-neutral-500">{location}</p>}
        </div>
      )}
    </li>
  )
}

const OutcomeNote = ({ outcome }: { readonly outcome: TestRunOutcome }) => {
  const { t } = useTranslation('runtime')
  switch (outcome._tag) {
    case 'Running':
      return <span>{t('tests.running')}</span>
    case 'Finished':
      return outcome.status === 'errored' ? <span>{t('tests.errored')}</span> : null
    case 'Interrupted':
      return <span>{t('tests.interrupted')}</span>
    case 'TimedOut':
      return <span>{t('tests.timedOut', { seconds: Math.round(outcome.limitMs / 1000) })}</span>
    default:
      return <span>{t('tests.crashed', { message: outcome.message })}</span>
  }
}

export const TestsPanel = ({ run }: TestsPanelProps) => {
  const { t } = useTranslation('runtime')
  return (
    <section aria-label={t('tests.label')} className="h-full p-3 text-sm">
      {run === undefined ? (
        <p className="text-neutral-600 dark:text-neutral-400">{t('tests.empty')}</p>
      ) : (
        <>
          <p role="status" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-medium">
            <span className={STATUS_STYLE.passed.className}>{t('tests.passed', { count: run.counts.passed })}</span>
            <span className={run.counts.failed > 0 ? STATUS_STYLE.failed.className : ''}>
              {t('tests.failed', { count: run.counts.failed })}
            </span>
            {run.counts.skipped > 0 ? (
              <span className={STATUS_STYLE.skipped.className}>
                {t('tests.skipped', { count: run.counts.skipped })}
              </span>
            ) : null}
            <OutcomeNote outcome={run.outcome} />
          </p>
          {run.diagnostics.length > 0 ? (
            <ul className="mb-3 space-y-1 font-mono text-xs text-amber-800 dark:text-amber-300">
              {run.diagnostics.map((diagnostic, index) => (
                <li key={index}>{formatDiagnostic(diagnostic)}</li>
              ))}
            </ul>
          ) : null}
          {groupByFile(run.tests).map(([file, tests]) => (
            <div key={file} className="mb-3">
              <h3 className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{file}</h3>
              <ul>
                {tests.map((test) => (
                  <TestItem key={test.testId} test={test} />
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

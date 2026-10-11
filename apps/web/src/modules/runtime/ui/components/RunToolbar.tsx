import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'

export type RunToolbarProps = {
  readonly status: 'loading' | 'ready' | 'failed'
  readonly bootError: string | undefined
  readonly isRunning: boolean
  readonly isTesting: boolean
  readonly onRun: () => void
  readonly onTest: () => void
  readonly onRetry: () => void
}

export const RunToolbar = ({ status, bootError, isRunning, isTesting, onRun, onTest, onRetry }: RunToolbarProps) => {
  const { t } = useTranslation('runtime')
  const ready = status === 'ready'
  const reason = ready ? undefined : t('loading')
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div role="status" className="min-w-0 flex-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
        {status === 'loading' ? t('loading') : null}
        {status === 'failed' ? (
          <span className="text-red-700 dark:text-red-400">{t('bootFailed', { reason: bootError ?? '' })}</span>
        ) : null}
      </div>
      {status === 'failed' ? <Button onClick={onRetry}>{t('retry')}</Button> : null}
      <Button variant="primary" disabled={!ready} title={reason} aria-busy={isRunning} onClick={onRun}>
        <span aria-hidden="true">▶</span>
        {t('run')}
      </Button>
      <Button disabled={!ready} title={reason} aria-busy={isTesting} onClick={onTest}>
        <span aria-hidden="true">✓</span>
        {t('test')}
      </Button>
    </div>
  )
}

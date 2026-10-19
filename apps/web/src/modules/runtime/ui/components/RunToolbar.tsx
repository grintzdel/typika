import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { isDownloading, type RuntimeDownload } from '../../core/domain/runtime-download.domain-model.ts'

export type RunToolbarProps = {
  readonly status: 'idle' | 'loading' | 'ready' | 'failed' | 'unsupported' | 'insecure'
  readonly bootError: string | undefined
  readonly download: RuntimeDownload | undefined
  readonly isRunning: boolean
  readonly isTesting: boolean
  readonly onRun: () => void
  readonly onTest: () => void
  readonly onStop: () => void
  readonly onRetry: () => void
}

const MEGABYTE = 1_000_000

export const RunToolbar = ({
  status,
  bootError,
  download,
  isRunning,
  isTesting,
  onRun,
  onTest,
  onStop,
  onRetry,
}: RunToolbarProps) => {
  const { t } = useTranslation('runtime')
  const ready = status === 'ready' || status === 'idle'
  const reason = ready ? undefined : status === 'unsupported' ? t('unsupported') : t('loading')
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div
        role="status"
        className="flex min-w-0 flex-1 items-center gap-2 truncate text-xs text-neutral-600 dark:text-neutral-400"
      >
        {status === 'loading' ? <span className="truncate">{t('loading')}</span> : null}
        {status === 'loading' && isDownloading(download) ? (
          <>
            <progress
              className="h-1.5 w-24 shrink-0 accent-blue-600"
              aria-label={t('download.label')}
              max={download.totalBytes}
              value={download.loadedBytes}
            />
            <span className="shrink-0 tabular-nums">
              {t('download.progress', {
                loaded: download.loadedBytes / MEGABYTE,
                total: download.totalBytes / MEGABYTE,
              })}
            </span>
          </>
        ) : null}
        {status === 'failed' ? (
          <span className="text-red-700 dark:text-red-400">{t('bootFailed', { reason: bootError ?? '' })}</span>
        ) : null}
        {status === 'unsupported' ? <span className="truncate">{t('unsupported')}</span> : null}
        {status === 'insecure' ? <span className="truncate">{t('insecure')}</span> : null}
      </div>
      {status === 'failed' ? <Button onClick={onRetry}>{t('retry')}</Button> : null}
      {isRunning || isTesting ? (
        <Button onClick={onStop}>
          <span aria-hidden="true">■</span>
          {t('stop')}
        </Button>
      ) : null}
      {status === 'insecure' ? null : (
        <>
          <Button variant="primary" disabled={!ready} title={reason} aria-busy={isRunning} onClick={onRun}>
            <span aria-hidden="true">▶</span>
            {t('run')}
          </Button>
          <Button disabled={!ready} title={reason} aria-busy={isTesting} onClick={onTest}>
            <span aria-hidden="true">✓</span>
            {t('test')}
          </Button>
        </>
      )}
    </div>
  )
}

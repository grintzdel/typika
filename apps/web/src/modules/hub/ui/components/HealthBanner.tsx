import { HealthStatus } from '@typika/registry-tools/health-status'
import { useTranslation } from 'react-i18next'

export type HealthBannerProps = {
  readonly health: { readonly status: HealthStatus; readonly runUrl: string | null } | undefined
  readonly alternatives: string
}

export const HealthBanner = ({ health, alternatives }: HealthBannerProps) => {
  const { t } = useTranslation('hub')
  if (health?.status === HealthStatus.BROKEN)
    return (
      <div
        role="note"
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      >
        <p>{t('health.broken')}</p>
        {health.runUrl === null ? null : (
          <a href={health.runUrl} className="underline underline-offset-2">
            {t('health.run')}
          </a>
        )}
      </div>
    )
  if (health?.status === HealthStatus.DEPRECATED)
    return (
      <div
        role="note"
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-neutral-300 bg-neutral-100 px-4 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        <p>{t('health.deprecated')}</p>
        <a href={alternatives} className="underline underline-offset-2">
          {t('health.alternatives')}
        </a>
      </div>
    )
  return null
}

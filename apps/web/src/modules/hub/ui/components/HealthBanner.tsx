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
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-danger-border bg-danger-bg px-4 py-2 text-base text-danger-fg"
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
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-strong bg-surface-muted px-4 py-2 text-base text-fg"
      >
        <p>{t('health.deprecated')}</p>
        <a href={alternatives} className="underline underline-offset-2">
          {t('health.alternatives')}
        </a>
      </div>
    )
  return null
}

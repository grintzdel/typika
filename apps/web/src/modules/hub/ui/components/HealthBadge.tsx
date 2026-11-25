import { HealthStatus } from '@typika/registry-tools/health-status'
import { useTranslation } from 'react-i18next'

const STYLE: Readonly<Record<Exclude<HealthStatus, 'healthy'>, string>> = {
  degraded: 'bg-warning-bg text-warning-fg ring-warning-border',
  broken: 'bg-danger-bg text-danger-fg ring-danger-border',
  deprecated: 'bg-surface-muted text-fg-muted ring-border-strong',
}

export const HealthBadge = ({ status }: { readonly status: HealthStatus | undefined }) => {
  const { t } = useTranslation('hub')
  if (status === undefined || status === HealthStatus.HEALTHY) return null
  return (
    <span className={`rounded-full px-3 py-0.5 font-semibold ring-1 ring-inset ${STYLE[status]}`}>
      {t(`values.health.${status}`)}
    </span>
  )
}

import { HealthStatus } from '@typika/registry-tools/health-status'
import { useTranslation } from 'react-i18next'

const STYLE: Readonly<Record<Exclude<HealthStatus, 'healthy'>, string>> = {
  degraded: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  broken: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  deprecated: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100',
}

export const HealthBadge = ({ status }: { readonly status: HealthStatus | undefined }) => {
  const { t } = useTranslation('hub')
  if (status === undefined || status === HealthStatus.HEALTHY) return null
  return <span className={`rounded px-1.5 py-0.5 ${STYLE[status]}`}>{t(`values.health.${status}`)}</span>
}

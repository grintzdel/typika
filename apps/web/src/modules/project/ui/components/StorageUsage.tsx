import { useTranslation } from 'react-i18next'

import type { StorageUsage as Usage } from '../../core/domain/storage-usage.domain-model.ts'

export type StorageUsageProps = {
  readonly usage: Usage | undefined
}

const UNITS: ReadonlyArray<readonly [string, number]> = [
  ['gigabyte', 1e9],
  ['megabyte', 1e6],
  ['kilobyte', 1e3],
]

const formatBytes = (language: string, bytes: number) => {
  const [unit, size] = UNITS.find(([, length]) => bytes >= length) ?? ['byte', 1]
  return new Intl.NumberFormat(language, { style: 'unit', unit, maximumFractionDigits: 1 }).format(bytes / size)
}

export const StorageUsage = ({ usage }: StorageUsageProps) => {
  const { t, i18n } = useTranslation('project')
  if (usage === undefined) return null
  return (
    <div className="space-y-2 text-base">
      <p className="text-fg-muted">
        {t('storage.used', {
          usage: formatBytes(i18n.language, usage.usage),
          quota: formatBytes(i18n.language, usage.quota),
        })}
      </p>
      {usage.isNearlyFull ? (
        <p role="alert" className="rounded-sm border border-warning-border bg-warning-bg p-3 text-warning-fg">
          {t('storage.nearlyFull')}
        </p>
      ) : null}
    </div>
  )
}

import { useTranslation } from 'react-i18next'

export type ProjectStatusProps = {
  readonly title: string
  readonly isModified: boolean
  readonly saveFailed: boolean
}

export const ProjectStatus = ({ title, isModified, saveFailed }: ProjectStatusProps) => {
  const { t } = useTranslation('project')
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="truncate text-sm font-semibold">{title}</h1>
      {isModified && !saveFailed ? (
        <span aria-hidden="true" className="text-xs text-amber-600 dark:text-amber-400">
          ●
        </span>
      ) : null}
      <span
        role="status"
        aria-label={t('status.label')}
        className={`text-xs whitespace-nowrap ${saveFailed ? 'font-medium text-red-700 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`}
      >
        {saveFailed ? t('status.unsaved') : isModified ? t('status.modified') : ''}
      </span>
    </div>
  )
}

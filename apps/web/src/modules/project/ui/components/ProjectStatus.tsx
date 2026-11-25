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
      <h1 className="truncate text-compact font-semibold">{title}</h1>
      {isModified && !saveFailed ? (
        <span aria-hidden="true" className="text-sm text-modified">
          ●
        </span>
      ) : null}
      <span
        role="status"
        aria-label={t('status.label')}
        className={`text-sm whitespace-nowrap ${saveFailed ? 'font-semibold text-danger-text' : 'text-fg-muted'}`}
      >
        {saveFailed ? t('status.unsaved') : isModified ? t('status.modified') : ''}
      </span>
    </div>
  )
}

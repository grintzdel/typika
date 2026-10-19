import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'

export type SharedProjectBannerProps = {
  readonly templateName: string
  readonly templateTitle: string
  readonly isSaved: boolean
  readonly onSave: () => void
}

export const SharedProjectBanner = ({ templateName, templateTitle, isSaved, onSave }: SharedProjectBannerProps) => {
  const { t } = useTranslation('project')
  return (
    <section
      aria-label={t('shared.label')}
      className="flex flex-wrap items-center gap-3 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"
    >
      <p>
        {t('shared.basedOn')}{' '}
        <a href={`/templates/${templateName}`} className="underline">
          {templateTitle}
        </a>
      </p>
      {isSaved ? <p role="status">{t('shared.saved')}</p> : <Button onClick={onSave}>{t('shared.save')}</Button>}
    </section>
  )
}

import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { StatusGlyph } from '../../../../ui/StatusGlyph.tsx'

export type SharedProjectBannerProps = {
  readonly templateName: string | undefined
  readonly templateTitle: string
  readonly isSaved: boolean
  readonly onSave: () => void
}

export const SharedProjectBanner = ({ templateName, templateTitle, isSaved, onSave }: SharedProjectBannerProps) => {
  const { t } = useTranslation('project')
  return (
    <section
      aria-label={t('shared.label')}
      className="flex flex-wrap items-center gap-3 border-b border-info-border bg-info-bg px-4 py-2 text-base text-info-fg"
    >
      <StatusGlyph tone="info" />
      {templateName === undefined ? (
        <p>{t('shared.personal')}</p>
      ) : (
        <p>
          {t('shared.basedOn')}{' '}
          <a href={`/templates/${templateName}`} className="underline">
            {templateTitle}
          </a>
        </p>
      )}
      {isSaved ? <p role="status">{t('shared.saved')}</p> : <Button onClick={onSave}>{t('shared.save')}</Button>}
    </section>
  )
}

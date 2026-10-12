import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ContentMarkdown } from '../../../shared/ui/components/ContentMarkdown.tsx'

export type TourStepBodyProps = {
  readonly body: string
  readonly isChanged: boolean
  readonly embeddedTemplates: ReadonlyArray<string>
  readonly onOpenOriginal: () => void
}

export const TourStepBody = ({ body, isChanged, embeddedTemplates, onOpenOriginal }: TourStepBodyProps) => {
  const { t } = useTranslation('tour')
  return (
    <>
      {isChanged ? (
        <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>{t('changed')}</p>
          <Button className="mt-2" onClick={onOpenOriginal}>
            {t('openOriginal')}
          </Button>
        </div>
      ) : null}
      <ContentMarkdown markdown={body} embeddedTemplates={embeddedTemplates} />
    </>
  )
}

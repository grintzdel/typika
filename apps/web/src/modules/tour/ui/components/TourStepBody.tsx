import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { StatusGlyph } from '../../../../ui/StatusGlyph.tsx'
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
        <div className="mt-3 flex gap-2 rounded-sm border border-warning-border bg-warning-bg p-3 text-warning-fg">
          <StatusGlyph tone="warning" />
          <div>
            <p>{t('changed')}</p>
            <Button className="mt-2" onClick={onOpenOriginal}>
              {t('openOriginal')}
            </Button>
          </div>
        </div>
      ) : null}
      <ContentMarkdown markdown={body} embeddedTemplates={embeddedTemplates} />
    </>
  )
}

import { useTranslation } from 'react-i18next'

import { ContentMarkdown } from '../../../shared/ui/components/ContentMarkdown.tsx'

export type EmbedTourStepProps = {
  readonly title: string
  readonly body: string
}

export const EmbedTourStep = ({ title, body }: EmbedTourStepProps) => {
  const { t } = useTranslation('embed')
  return (
    <section
      aria-label={t('tourStep')}
      lang="en"
      className="max-h-[30%] overflow-auto border-b border-border px-3 py-2 text-compact"
    >
      <h2 className="font-semibold">{title}</h2>
      <ContentMarkdown markdown={body} embeddedTemplates={[]} />
    </section>
  )
}

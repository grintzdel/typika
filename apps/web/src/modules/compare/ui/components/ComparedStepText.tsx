import type { TourStep } from '@typika/manifest'
import { useTranslation } from 'react-i18next'

import { ContentMarkdown } from '../../../shared/ui/components/ContentMarkdown.tsx'

export type ComparedStepSide = { readonly languageName: string; readonly step: TourStep | undefined }

export type ComparedStepTextProps = {
  readonly title: string
  readonly sides: ReadonlyArray<ComparedStepSide>
  readonly embeddedTemplates: ReadonlyArray<string>
}

export const ComparedStepText = ({ title, sides, embeddedTemplates }: ComparedStepTextProps) => {
  const { t } = useTranslation('compare')
  return sides.map(({ languageName, step }) => (
    <div key={languageName} className="border-b border-neutral-200 py-2 last:border-0 dark:border-neutral-800">
      <h3 className="mt-2 text-xs font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
        {languageName}
      </h3>
      {step === undefined ? (
        <p className="my-3 italic">{t('noEquivalent', { language: languageName })}</p>
      ) : (
        <div lang="en">
          {step.title === title ? null : <p className="mt-2 font-medium">{step.title}</p>}
          <ContentMarkdown markdown={step.body} embeddedTemplates={embeddedTemplates} />
        </div>
      )}
    </div>
  ))
}

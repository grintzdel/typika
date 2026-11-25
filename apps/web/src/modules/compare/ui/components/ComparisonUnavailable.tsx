import { useTranslation } from 'react-i18next'

import type { SidesChoice } from '../../core/domain/compare.domain-model.ts'

export type ComparisonUnavailableProps = {
  readonly choice: Exclude<SidesChoice, { readonly _tag: 'Chosen' }>
}

export const ComparisonUnavailable = ({ choice }: ComparisonUnavailableProps) => {
  const { t } = useTranslation('compare')
  return (
    <p role="status" className="text-compact text-fg-muted">
      {choice._tag === 'Unavailable' ? t('unavailable', { language: choice.language }) : null}
      {choice._tag === 'SameLanguage' ? t('sameLanguage') : null}
      {choice._tag === 'NoVariant' ? t('noVariant') : null}
    </p>
  )
}

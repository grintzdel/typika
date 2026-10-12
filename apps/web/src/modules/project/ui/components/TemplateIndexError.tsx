import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ErrorState } from '../../../../ui/ErrorState.tsx'
import type { ProjectLoadFailure } from '../../core/domain/constants/project-load-failure.constant.ts'

export type TemplateIndexErrorProps = {
  readonly failure: ProjectLoadFailure
  readonly onRetry: () => void
}

export const TemplateIndexError = ({ failure, onRetry }: TemplateIndexErrorProps) => {
  const { t } = useTranslation('project')
  return (
    <ErrorState title={t('indexFailed.title')}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t(`indexFailed.${failure}`)}</p>
      <Button onClick={onRetry}>{t('retry')}</Button>
    </ErrorState>
  )
}

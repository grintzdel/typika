import { useTranslation } from 'react-i18next'

import { ErrorState } from '../../../../ui/ErrorState.tsx'
import type { OpenTemplateFailure } from '../hooks/use-template-project.ts'

export type TemplateLoadErrorProps = {
  readonly failure: OpenTemplateFailure
}

export const TemplateLoadError = ({ failure }: TemplateLoadErrorProps) => {
  const { t } = useTranslation('project')
  return (
    <ErrorState title={t('loadFailed.title')}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {failure._tag === 'Invalid' ? t('loadFailed.invalid', { name: failure.name }) : null}
        {failure._tag === 'NotFound' ? t('loadFailed.notFound', { name: failure.name }) : null}
        {failure._tag === 'ExerciseNotFound'
          ? t('loadFailed.exerciseNotFound', { name: failure.name, exercise: failure.exercise })
          : null}
      </p>
    </ErrorState>
  )
}

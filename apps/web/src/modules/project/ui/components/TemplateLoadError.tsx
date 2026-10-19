import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ErrorState } from '../../../../ui/ErrorState.tsx'
import type { OpenTemplateFailure } from '../hooks/use-template-project.ts'

export type TemplateLoadErrorProps = {
  readonly failure: OpenTemplateFailure
  readonly onRetry: () => void
}

const RETRYABLE: ReadonlySet<OpenTemplateFailure['_tag']> = new Set(['IndexUnavailable', 'FilesUnavailable', 'Unknown'])

export const TemplateLoadError = ({ failure, onRetry }: TemplateLoadErrorProps) => {
  const { t } = useTranslation('project')
  return (
    <ErrorState title={t('loadFailed.title')}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {failure._tag === 'Invalid' ? t('loadFailed.invalid', { name: failure.name }) : null}
        {failure._tag === 'NotFound' ? t('loadFailed.notFound', { name: failure.name }) : null}
        {failure._tag === 'ExerciseNotFound'
          ? t('loadFailed.exerciseNotFound', { name: failure.name, exercise: failure.exercise })
          : null}
        {failure._tag === 'IndexUnavailable' ? t(`indexFailed.${failure.failure}`) : null}
        {failure._tag === 'FilesUnavailable' ? t('loadFailed.filesUnavailable', { name: failure.name }) : null}
        {failure._tag === 'ProjectNotFound' ? t('loadFailed.projectNotFound') : null}
        {failure._tag === 'ShareInvalid' ? t(`shareFailed.${failure.reason}`) : null}
        {failure._tag === 'Unknown' ? t('loadFailed.unknown') : null}
      </p>
      {RETRYABLE.has(failure._tag) ? <Button onClick={onRetry}>{t('retry')}</Button> : null}
      {failure._tag === 'ShareInvalid' ? (
        <a href="/templates" className="text-sm text-sky-700 hover:underline">
          {t('shareFailed.back')}
        </a>
      ) : null}
    </ErrorState>
  )
}

import { useTranslation } from 'react-i18next'

import { ErrorState } from '../../../../ui/ErrorState.tsx'
import type { GitHubCallbackFailure } from '../hooks/use-github-callback.ts'

export type GitHubCallbackStatusProps = {
  readonly failure: GitHubCallbackFailure | undefined
}

export const GitHubCallbackStatus = ({ failure }: GitHubCallbackStatusProps) => {
  const { t } = useTranslation('app')
  if (failure === undefined)
    return (
      <p role="status" className="mx-auto mt-24 max-w-lg px-6 text-center text-sm">
        {t('github.connecting')}
      </p>
    )
  return (
    <ErrorState title={t('github.title')}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t(`github.failed.${failure}`)}</p>
      <a href="/templates" className="text-sm text-sky-700 hover:underline">
        {t('github.back')}
      </a>
    </ErrorState>
  )
}

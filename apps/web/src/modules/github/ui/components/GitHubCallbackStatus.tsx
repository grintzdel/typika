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
      <p role="status" className="mx-auto mt-24 max-w-lg px-6 text-center text-base">
        {t('github.connecting')}
      </p>
    )
  return (
    <ErrorState title={t('github.title')}>
      <p className="text-base text-fg-muted">{t(`github.failed.${failure}`)}</p>
      <a href="/templates" className="text-base text-link underline underline-offset-2 hover:text-link-hover">
        {t('github.back')}
      </a>
    </ErrorState>
  )
}

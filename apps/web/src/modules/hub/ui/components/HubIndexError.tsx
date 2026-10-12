import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import { ErrorState } from '../../../../ui/ErrorState.tsx'
import {
  RegistryIndexFailure,
  type RegistryIndexFailure as Failure,
} from '../../../shared/core/domain/constants/registry-index-failure.constant.ts'

export type HubIndexErrorProps = {
  readonly failure: Failure
  readonly onRetry: () => void
}

export const HubIndexError = ({ failure, onRetry }: HubIndexErrorProps) => {
  const { t } = useTranslation('hub')
  return (
    <ErrorState title={t('indexFailed.title')}>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t(`indexFailed.${failure}`)}</p>
      {failure === RegistryIndexFailure.NETWORK ? <Button onClick={onRetry}>{t('retry')}</Button> : null}
    </ErrorState>
  )
}

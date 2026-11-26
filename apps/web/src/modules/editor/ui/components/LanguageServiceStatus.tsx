import { useTranslation } from 'react-i18next'

import { Button } from '../../../../ui/Button.tsx'
import type { LanguageServiceStatus as Status } from '../hooks/use-language-service.ts'

export type LanguageServiceStatusProps = {
  readonly status: Status
  readonly onReload: () => void
}

const MESSAGE_KEYS = {
  starting: 'languageService.starting',
  unavailable: 'languageService.unavailable',
  outdated: 'languageService.outdated',
} as const

export const LanguageServiceStatus = ({ status, onReload }: LanguageServiceStatusProps) => {
  const { t } = useTranslation('editor')
  return (
    <>
      <span
        role="status"
        aria-label={t('languageService.label')}
        className={`text-sm whitespace-nowrap ${status === 'unavailable' ? 'text-danger-text' : 'text-fg-muted'}`}
      >
        {status === 'starting' || status === 'unavailable' || status === 'outdated' ? t(MESSAGE_KEYS[status]) : ''}
      </span>
      {status === 'outdated' ? <Button onClick={onReload}>{t('languageService.reload')}</Button> : null}
    </>
  )
}

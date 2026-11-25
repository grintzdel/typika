import { useTranslation } from 'react-i18next'

import type { LanguageServiceStatus as Status } from '../hooks/use-language-service.ts'

export const LanguageServiceStatus = ({ status }: { readonly status: Status }) => {
  const { t } = useTranslation('editor')
  return (
    <span
      role="status"
      aria-label={t('languageService.label')}
      className={`text-sm whitespace-nowrap ${status === 'unavailable' ? 'text-danger-text' : 'text-fg-muted'}`}
    >
      {status === 'starting'
        ? t('languageService.starting')
        : status === 'unavailable'
          ? t('languageService.unavailable')
          : ''}
    </span>
  )
}

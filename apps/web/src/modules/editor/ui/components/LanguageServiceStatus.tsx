import { useTranslation } from 'react-i18next'

import type { LanguageServiceStatus as Status } from '../hooks/use-language-service.ts'

export const LanguageServiceStatus = ({ status }: { readonly status: Status }) => {
  const { t } = useTranslation('editor')
  return (
    <span
      role="status"
      aria-label={t('languageService.label')}
      className={`text-xs whitespace-nowrap ${status === 'unavailable' ? 'text-red-700 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-400'}`}
    >
      {status === 'starting'
        ? t('languageService.starting')
        : status === 'unavailable'
          ? t('languageService.unavailable')
          : ''}
    </span>
  )
}

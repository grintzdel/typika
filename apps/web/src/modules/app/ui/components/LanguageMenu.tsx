import { useTranslation } from 'react-i18next'

import { isSupportedLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../../i18n/i18n.ts'

export type LanguageMenuProps = {
  readonly language: SupportedLanguage
  readonly disabled: boolean
  readonly onChange: (language: SupportedLanguage) => void
}

export const LanguageMenu = ({ language, disabled, onChange }: LanguageMenuProps) => {
  const { t } = useTranslation('app')
  return (
    <select
      aria-label={t('language.label')}
      value={language}
      disabled={disabled}
      onChange={(event) => isSupportedLanguage(event.target.value) && onChange(event.target.value)}
      className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm disabled:opacity-60 dark:border-neutral-700"
    >
      {SUPPORTED_LANGUAGES.map((option) => (
        <option key={option} value={option} lang={option}>
          {t(`language.names.${option}`)}
        </option>
      ))}
    </select>
  )
}

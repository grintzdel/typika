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
      className="min-h-control-sm rounded-md border border-border-strong bg-surface-raised px-3 text-base disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-fg"
    >
      {SUPPORTED_LANGUAGES.map((option) => (
        <option key={option} value={option} lang={option}>
          {t(`language.names.${option}`)}
        </option>
      ))}
    </select>
  )
}

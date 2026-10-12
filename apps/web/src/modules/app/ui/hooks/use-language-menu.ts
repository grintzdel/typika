import { useHydrated } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { isSupportedLanguage } from '../../../../i18n/i18n.ts'
import { browserStorage, storeLanguage } from '../../../../i18n/language-preference.ts'
import type { LanguageMenuProps } from '../components/LanguageMenu.tsx'

export const useLanguageMenu = (): LanguageMenuProps => {
  const { i18n } = useTranslation()
  const isHydrated = useHydrated()
  return {
    disabled: !isHydrated,
    language: isSupportedLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en',
    onChange: (language) => {
      storeLanguage(browserStorage, language)
      void i18n.changeLanguage(language)
    },
  }
}

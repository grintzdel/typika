import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resources } from './resources.ts'

export const i18n = createInstance()

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const

export const detectLanguage = (languages: ReadonlyArray<string>) =>
  languages.map((language) => language.split('-')[0]).find((language) => language === 'fr' || language === 'en') ?? 'en'

export const initI18n = (language: string) =>
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  })

import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resources } from './resources.ts'

export const i18n = createInstance()

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const isSupportedLanguage = (value: unknown): value is SupportedLanguage =>
  (SUPPORTED_LANGUAGES as ReadonlyArray<unknown>).includes(value)

export const detectLanguage = (languages: ReadonlyArray<string>): SupportedLanguage =>
  languages.map((language) => language.split('-')[0]).find(isSupportedLanguage) ?? 'en'

export const initI18n = (language: string) =>
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  })

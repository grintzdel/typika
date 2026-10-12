import { detectLanguage, isSupportedLanguage, type SupportedLanguage } from './i18n.ts'

const KEY = 'typika:language'

type LanguageStorage = Pick<Storage, 'getItem' | 'setItem'>

const storedLanguage = (storage: LanguageStorage) => {
  try {
    return storage.getItem(KEY)
  } catch {
    return null
  }
}

export const preferredLanguage = (
  storage: LanguageStorage,
  browserLanguages: ReadonlyArray<string>
): SupportedLanguage => {
  const stored = storedLanguage(storage)
  return isSupportedLanguage(stored) ? stored : detectLanguage(browserLanguages)
}

export const storeLanguage = (storage: LanguageStorage, language: SupportedLanguage) => {
  try {
    storage.setItem(KEY, language)
  } catch {
    // The choice then lasts until the page is reloaded.
  }
}

export const browserStorage: LanguageStorage = {
  getItem: (key) => globalThis.localStorage.getItem(key),
  setItem: (key, value) => globalThis.localStorage.setItem(key, value),
}

import { Language } from '@typika/manifest'

const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  go: 'Go',
  kotlin: 'Kotlin',
}

const isLanguage = (id: string): id is Language => (Object.values(Language) as ReadonlyArray<string>).includes(id)

export const languageNameOf = (id: string): string => (isLanguage(id) ? LANGUAGE_NAMES[id] : id)

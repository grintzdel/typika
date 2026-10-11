import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import type { LanguageSupport } from '@codemirror/language'

import { languageOf, type EditorLanguage } from '../../core/domain/language.domain-model.ts'

const LANGUAGES: Readonly<Record<EditorLanguage, () => LanguageSupport | undefined>> = {
  typescript: () => javascript({ typescript: true }),
  javascript: () => javascript(),
  json: () => javascript(),
  markdown: () => markdown(),
  text: () => undefined,
}

export const languageSupportOf = (path: string): LanguageSupport | undefined => LANGUAGES[languageOf(path)]()

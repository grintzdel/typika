import { go } from '@codemirror/lang-go'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { LanguageSupport, StreamLanguage } from '@codemirror/language'
import { kotlin } from '@codemirror/legacy-modes/mode/clike'

import { languageOf, type EditorLanguage } from '../../core/domain/language.domain-model.ts'

const LANGUAGES: Readonly<Record<EditorLanguage, () => LanguageSupport | undefined>> = {
  typescript: () => javascript({ typescript: true }),
  javascript: () => javascript(),
  go: () => go(),
  kotlin: () => new LanguageSupport(StreamLanguage.define(kotlin)),
  json: () => javascript(),
  markdown: () => markdown(),
  text: () => undefined,
}

export const languageSupportOf = (path: string): LanguageSupport | undefined => LANGUAGES[languageOf(path)]()

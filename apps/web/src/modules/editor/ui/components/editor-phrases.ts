import type { TFunction } from 'i18next'

const PHRASE_KEYS = {
  Find: 'phrases.find',
  Replace: 'phrases.replace',
  next: 'phrases.next',
  previous: 'phrases.previous',
  all: 'phrases.all',
  'match case': 'phrases.matchCase',
  'by word': 'phrases.byWord',
  regexp: 'phrases.regexp',
  replace: 'phrases.replaceOne',
  'replace all': 'phrases.replaceAll',
  close: 'phrases.close',
  'current match': 'phrases.currentMatch',
  'replaced $ matches': 'phrases.replacedMatches',
  'replaced match on line $': 'phrases.replacedMatchOnLine',
  'on line': 'phrases.onLine',
  'Go to line': 'phrases.goToLine',
  go: 'phrases.go',
  'New name': 'rename.label',
  'Enter to rename, Escape to cancel': 'rename.hint',
  'This symbol cannot be renamed.': 'rename.unavailable',
} as const

export const editorPhrasesOf = (t: TFunction<'editor'>): Readonly<Record<string, string>> =>
  Object.fromEntries(Object.entries(PHRASE_KEYS).map(([phrase, key]) => [phrase, t(key)]))

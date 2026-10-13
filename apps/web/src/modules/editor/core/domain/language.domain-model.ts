export const EditorLanguage = {
  TYPESCRIPT: 'typescript',
  JAVASCRIPT: 'javascript',
  GO: 'go',
  KOTLIN: 'kotlin',
  JSON: 'json',
  MARKDOWN: 'markdown',
  TEXT: 'text',
} as const

export type EditorLanguage = (typeof EditorLanguage)[keyof typeof EditorLanguage]

const BY_EXTENSION: Readonly<Record<string, EditorLanguage>> = {
  ts: EditorLanguage.TYPESCRIPT,
  tsx: EditorLanguage.TYPESCRIPT,
  mts: EditorLanguage.TYPESCRIPT,
  js: EditorLanguage.JAVASCRIPT,
  jsx: EditorLanguage.JAVASCRIPT,
  mjs: EditorLanguage.JAVASCRIPT,
  go: EditorLanguage.GO,
  kt: EditorLanguage.KOTLIN,
  kts: EditorLanguage.KOTLIN,
  json: EditorLanguage.JSON,
  md: EditorLanguage.MARKDOWN,
}

export const languageOf = (path: string): EditorLanguage => {
  const name = path.split('/').at(-1) ?? path
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? EditorLanguage.TEXT : (BY_EXTENSION[name.slice(dot + 1)] ?? EditorLanguage.TEXT)
}

export const FileKind = {
  TYPESCRIPT: 'typescript',
  JAVASCRIPT: 'javascript',
  GO: 'go',
  KOTLIN: 'kotlin',
  JSON: 'json',
  MARKDOWN: 'markdown',
  CONFIG: 'config',
  SHELL: 'shell',
  ARCHIVE: 'archive',
  TEXT: 'text',
} as const

export type FileKind = (typeof FileKind)[keyof typeof FileKind]

const BY_EXTENSION: Readonly<Record<string, FileKind>> = {
  ts: FileKind.TYPESCRIPT,
  tsx: FileKind.TYPESCRIPT,
  mts: FileKind.TYPESCRIPT,
  cts: FileKind.TYPESCRIPT,
  js: FileKind.JAVASCRIPT,
  jsx: FileKind.JAVASCRIPT,
  mjs: FileKind.JAVASCRIPT,
  cjs: FileKind.JAVASCRIPT,
  go: FileKind.GO,
  kt: FileKind.KOTLIN,
  kts: FileKind.KOTLIN,
  json: FileKind.JSON,
  md: FileKind.MARKDOWN,
  toml: FileKind.CONFIG,
  properties: FileKind.CONFIG,
  yaml: FileKind.CONFIG,
  yml: FileKind.CONFIG,
  sh: FileKind.SHELL,
  bat: FileKind.SHELL,
  jar: FileKind.ARCHIVE,
  zip: FileKind.ARCHIVE,
}

const BY_NAME: Readonly<Record<string, FileKind>> = {
  'go.mod': FileKind.GO,
  'go.sum': FileKind.GO,
  'go.work': FileKind.GO,
  gradlew: FileKind.SHELL,
}

export const fileKindOf = (path: string): FileKind => {
  const name = (path.split('/').at(-1) ?? path).toLowerCase()
  const byName = BY_NAME[name]
  if (byName !== undefined) return byName
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? FileKind.TEXT : (BY_EXTENSION[name.slice(dot + 1)] ?? FileKind.TEXT)
}

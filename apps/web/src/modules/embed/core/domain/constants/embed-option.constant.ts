export const EmbedPanel = {
  CONSOLE: 'console',
  TESTS: 'tests',
  PREVIEW: 'preview',
  NONE: 'none',
} as const

export type EmbedPanel = (typeof EmbedPanel)[keyof typeof EmbedPanel]

export const EmbedTheme = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const

export type EmbedTheme = (typeof EmbedTheme)[keyof typeof EmbedTheme]

export const EmbedRun = {
  AUTO: 'auto',
  CLICK: 'click',
} as const

export type EmbedRun = (typeof EmbedRun)[keyof typeof EmbedRun]

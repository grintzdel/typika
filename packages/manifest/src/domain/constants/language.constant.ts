export const Language = {
  TYPESCRIPT: 'typescript',
  JAVASCRIPT: 'javascript',
  GO: 'go',
  KOTLIN: 'kotlin',
} as const

export type Language = (typeof Language)[keyof typeof Language]

export const RuntimeKind = {
  BROWSER_JS: 'browser-js',
  GO: 'go',
  KOTLIN: 'kotlin',
} as const

export type RuntimeKind = (typeof RuntimeKind)[keyof typeof RuntimeKind]

export const RUNTIME_OF_LANGUAGE: Readonly<Record<Language, RuntimeKind>> = {
  typescript: RuntimeKind.BROWSER_JS,
  javascript: RuntimeKind.BROWSER_JS,
  go: RuntimeKind.GO,
  kotlin: RuntimeKind.KOTLIN,
}

export const TEST_RUNNER_OF_RUNTIME = {
  'browser-js': 'vitest',
  go: 'go test',
  kotlin: 'kotlin.test',
} as const satisfies Record<RuntimeKind, string>

export type TestRunner = (typeof TEST_RUNNER_OF_RUNTIME)[RuntimeKind]

export const DEFAULT_TEST_INCLUDE: Readonly<Record<Language, ReadonlyArray<string>>> = {
  typescript: ['**/*.test.ts'],
  javascript: ['**/*.test.js'],
  go: ['**/*_test.go'],
  kotlin: ['src/test/kotlin/**/*.kt'],
}

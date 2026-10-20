export const ExitCode = {
  SUCCESS: 0,
  UNEXPECTED: 1,
  ARGS_INVALID: 2,
  TEMPLATE_NOT_FOUND: 3,
  VARIANT_OR_EXERCISE_NOT_FOUND: 4,
  MANIFEST_INVALID: 5,
  TARGET_NOT_EMPTY: 6,
  NETWORK: 7,
} as const

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode]

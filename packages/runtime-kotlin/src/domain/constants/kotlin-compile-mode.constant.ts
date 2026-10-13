export const KotlinCompileMode = {
  RUN: 'run',
  TEST: 'test',
} as const

export type KotlinCompileMode = (typeof KotlinCompileMode)[keyof typeof KotlinCompileMode]

export const Level = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const

export type Level = (typeof Level)[keyof typeof Level]

export const Paradigm = {
  OOP: 'oop',
  FUNCTIONAL: 'functional',
  PROCEDURAL: 'procedural',
  REACTIVE: 'reactive',
} as const

export type Paradigm = (typeof Paradigm)[keyof typeof Paradigm]

export const UseCase = {
  BACKEND: 'backend',
  FRONTEND: 'frontend',
  FULLSTACK: 'fullstack',
  LIBRARY: 'library',
  CLI: 'cli',
} as const

export type UseCase = (typeof UseCase)[keyof typeof UseCase]

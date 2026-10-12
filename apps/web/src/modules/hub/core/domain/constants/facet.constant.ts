export const Facet = {
  TOPIC: 'topic',
  LANGUAGE: 'language',
  PARADIGM: 'paradigm',
  LEVEL: 'level',
  FRAMEWORK: 'framework',
  LIBRARY: 'library',
  USE_CASE: 'useCase',
  CATEGORY: 'category',
} as const

export type Facet = (typeof Facet)[keyof typeof Facet]

export const FACETS: ReadonlyArray<Facet> = Object.values(Facet)

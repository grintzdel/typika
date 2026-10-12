export const TemplateSort = {
  RELEVANCE: 'relevance',
  CATALOGUE: 'catalogue',
  UPDATED: 'updated',
} as const

export type TemplateSort = (typeof TemplateSort)[keyof typeof TemplateSort]

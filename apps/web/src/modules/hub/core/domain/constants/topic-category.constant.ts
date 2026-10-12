export const TopicCategory = {
  ARCHITECTURE: 'architecture',
  PRINCIPLE: 'principle',
  DESIGN_PATTERN: 'design-pattern',
  FUNDAMENTAL: 'fundamental',
} as const

export type TopicCategory = (typeof TopicCategory)[keyof typeof TopicCategory]

export const TopicFamily = {
  CREATIONAL: 'creational',
  STRUCTURAL: 'structural',
  BEHAVIORAL: 'behavioral',
} as const

export type TopicFamily = (typeof TopicFamily)[keyof typeof TopicFamily]

import type { RegistryIndex } from '@typika/registry-tools/index-schema'

import { indexTemplate, registryIndex } from '../../shared/__tests__/registry-index.factory.ts'
import type { TemplatePage } from '../core/domain/hub.domain-model.ts'

const STRATEGY = 'design-pattern/behavioral/strategy'
const OBSERVER = 'design-pattern/behavioral/observer'
const HEXAGONAL = 'architecture/hexagonal'

export const hubIndex = (): RegistryIndex =>
  registryIndex({
    vocabulary: {
      topics: [
        { id: HEXAGONAL, label: 'Hexagonal architecture', category: 'architecture' },
        { id: 'principle/open-closed', label: 'Open/closed', category: 'principle' },
        { id: STRATEGY, label: 'Strategy', category: 'design-pattern', family: 'behavioral' },
        { id: OBSERVER, label: 'Observer', category: 'design-pattern', family: 'behavioral' },
      ],
      languages: ['typescript', 'go'],
    },
    templates: [
      indexTemplate('hexagonal-ts', {
        updatedAt: '2026-10-11',
        search: { text: 'hexagonal-ts hexagonal ports and adapters architecture' },
        manifest: { title: 'Hexagonal', summary: 'Ports and adapters.', facets: { topic: [HEXAGONAL] } },
      }),
      indexTemplate('observer-ts', {
        updatedAt: '2026-10-10',
        search: { text: 'observer-ts observer react to events' },
        manifest: { title: 'Observer', summary: 'React to events.', facets: { topic: [OBSERVER], level: 'beginner' } },
      }),
      indexTemplate('strategy-base-ts', { manifest: { role: 'base', facets: { topic: [STRATEGY] } } }),
      indexTemplate('strategy-go', {
        search: { text: 'strategy-go strategy in go a function per rule switch' },
        manifest: {
          title: 'Strategy in Go',
          base: 'github:typika/templates/strategy-base-go@0123456789ab',
          variants: { typescript: 'strategy-ts' },
          facets: { language: 'go', paradigm: ['functional'], topic: [STRATEGY, 'principle/open-closed'] },
        },
      }),
      indexTemplate('strategy-ts', {
        search: { text: 'strategy-ts strategy replace a growing switches' },
        manifest: {
          title: 'Strategy',
          summary: 'Replace a growing switch.',
          base: 'github:typika/templates/strategy-base-ts@a17e93a7af3e',
          variants: { go: 'strategy-go' },
          facets: { topic: [STRATEGY, 'principle/open-closed'] },
          tour: { steps: [{ id: 'switch', title: 'The growing switch' }] },
          exercises: [{ name: 'implement-express', kind: 'refactor', title: 'Implement express' }],
        },
      }),
    ],
  })

export const templatePage = (overrides: Partial<TemplatePage> = {}): TemplatePage => ({
  name: 'strategy-ts',
  title: 'Strategy: shipping options',
  summary: 'Pick an algorithm.',
  language: 'typescript',
  level: 'intermediate',
  license: 'MIT-0',
  ref: 'github:typika/templates/strategy/ts@a17e93a7af3e',
  updatedAt: '2026-10-12',
  category: 'official',
  maintainers: ['github:maoudin'],
  trail: [
    { topic: 'design-pattern', category: 'design-pattern' },
    { topic: 'design-pattern/behavioral', category: 'design-pattern', family: 'behavioral' },
  ],
  topics: [{ id: 'design-pattern/behavioral/strategy', label: 'Strategy' }],
  languages: [
    { language: 'typescript', name: 'strategy-ts' },
    { language: 'go', name: 'strategy-go' },
  ],
  tourSteps: ['The growing switch', 'Extracting the strategy'],
  base: 'strategy-base-ts',
  parent: undefined,
  exercises: [{ name: 'implement-express', kind: 'refactor', title: 'Implement express' }],
  ...overrides,
})

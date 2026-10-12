import { describe, expect, it } from 'vitest'

import { indexTemplate } from '../../../shared/__tests__/registry-index.factory.ts'
import { hubIndex } from '../../__tests__/hub-index.factory.ts'
import { conceptSectionsOf, listedTemplatesOf, templatePageOf } from './hub.domain-model.ts'

describe('conceptSectionsOf', () => {
  it('groups the variants of a concept in one card, led by its TypeScript template', () => {
    expect(conceptSectionsOf(hubIndex())).toEqual([
      {
        category: 'architecture',
        families: [],
        concepts: [
          {
            name: 'hexagonal-ts',
            label: 'Hexagonal architecture',
            summary: 'Ports and adapters.',
            languages: [{ language: 'typescript', name: 'hexagonal-ts' }],
          },
        ],
      },
      {
        category: 'design-pattern',
        families: ['behavioral'],
        concepts: [
          {
            name: 'strategy-ts',
            label: 'Strategy',
            summary: 'Replace a growing switch.',
            languages: [
              { language: 'typescript', name: 'strategy-ts' },
              { language: 'go', name: 'strategy-go' },
            ],
          },
          expect.objectContaining({ name: 'observer-ts', label: 'Observer' }),
        ],
      },
    ])
  })

  it('names a concept after its topic id when the vocabulary does not know it', () => {
    const index = hubIndex()
    const sections = conceptSectionsOf({
      ...index,
      templates: [indexTemplate('saga-ts', { manifest: { facets: { topic: ['architecture/saga'] } } })],
    })

    expect(sections).toEqual([
      { category: 'architecture', families: [], concepts: [expect.objectContaining({ label: 'architecture/saga' })] },
    ])
  })
})

describe('listedTemplatesOf', () => {
  it('lists the templates without their bases, with the values of each facet', () => {
    const listed = listedTemplatesOf(hubIndex())

    expect(listed.map((template) => template.name)).toEqual([
      'hexagonal-ts',
      'observer-ts',
      'strategy-go',
      'strategy-ts',
    ])
    expect(listed[2]).toEqual({
      name: 'strategy-go',
      title: 'Strategy in Go',
      summary: 'Replace a growing switch.',
      language: 'go',
      level: 'intermediate',
      values: {
        topic: ['design-pattern/behavioral/strategy', 'principle/open-closed'],
        language: ['go'],
        paradigm: ['functional'],
        level: ['intermediate'],
        framework: [],
        library: [],
        useCase: [],
        category: ['official'],
      },
    })
  })
})

describe('templatePageOf', () => {
  it('describes a template with its trail, languages, base, tour and exercises', () => {
    expect(templatePageOf(hubIndex(), 'strategy-ts')).toEqual({
      name: 'strategy-ts',
      title: 'Strategy',
      summary: 'Replace a growing switch.',
      language: 'typescript',
      level: 'intermediate',
      license: 'MIT-0',
      ref: 'github:typika/templates/strategy-ts@0123456789ab',
      category: 'official',
      maintainers: ['github:maoudin'],
      trail: [
        { topic: 'design-pattern', category: 'design-pattern' },
        { topic: 'design-pattern/behavioral', category: 'design-pattern', family: 'behavioral' },
      ],
      topics: [
        { id: 'design-pattern/behavioral/strategy', label: 'Strategy' },
        { id: 'principle/open-closed', label: 'Open/closed' },
      ],
      languages: [
        { language: 'typescript', name: 'strategy-ts' },
        { language: 'go', name: 'strategy-go' },
      ],
      tourSteps: ['The growing switch'],
      base: 'strategy-base-ts',
      parent: undefined,
      exercises: [{ name: 'implement-express', kind: 'refactor', title: 'Implement express' }],
    })
  })

  it('keeps the base ref when the index does not hold the base', () => {
    expect(templatePageOf(hubIndex(), 'strategy-go')?.base).toBe(
      'github:typika/templates/strategy-base-go@0123456789ab'
    )
  })

  it('finds no page for an unknown name', () => {
    expect(templatePageOf(hubIndex(), 'nope')).toBeUndefined()
  })
})

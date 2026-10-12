import { describe, expect, it } from 'vitest'

import { indexTemplate, templateHealth } from '../../../shared/__tests__/registry-index.factory.ts'
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

  it('groups every variant of a concept in one card when only the TypeScript template lists them all', () => {
    const topic = { facets: { topic: ['design-pattern/behavioral/strategy'] } }
    const sections = conceptSectionsOf({
      ...hubIndex(),
      templates: [
        indexTemplate('decorator-go', {
          manifest: { variants: { typescript: 'decorator-ts' }, facets: { ...topic.facets, language: 'go' } },
        }),
        indexTemplate('decorator-js', {
          manifest: { variants: { typescript: 'decorator-ts' }, facets: { ...topic.facets, language: 'javascript' } },
        }),
        indexTemplate('decorator-ts', {
          manifest: { variants: { go: 'decorator-go', javascript: 'decorator-js' }, ...topic },
        }),
      ],
    })

    expect(sections.flatMap(({ concepts }) => concepts)).toEqual([
      expect.objectContaining({
        name: 'decorator-ts',
        languages: [
          { language: 'typescript', name: 'decorator-ts' },
          { language: 'javascript', name: 'decorator-js' },
          { language: 'go', name: 'decorator-go' },
        ],
      }),
    ])
  })

  it('leaves the deprecated templates out of the home page', () => {
    const index = hubIndex()
    const sections = conceptSectionsOf({
      ...index,
      templates: index.templates.map((template) =>
        template.name === 'hexagonal-ts' ? { ...template, health: templateHealth('deprecated') } : template
      ),
    })

    expect(sections.map(({ category }) => category)).toEqual(['design-pattern'])
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
  it('lists the templates without their bases in the order of the catalogue, with the values of each facet', () => {
    const listed = listedTemplatesOf(hubIndex())

    expect(listed.map((template) => template.name)).toEqual([
      'hexagonal-ts',
      'strategy-ts',
      'strategy-go',
      'observer-ts',
    ])
    expect(listed[2]).toEqual({
      name: 'strategy-go',
      title: 'Strategy in Go',
      summary: 'Replace a growing switch.',
      language: 'go',
      level: 'intermediate',
      updatedAt: '2026-10-08',
      health: undefined,
      searchText: 'strategy-go strategy in go a function per rule switch',
      values: {
        topic: ['design-pattern/behavioral/strategy', 'principle/open-closed'],
        language: ['go'],
        paradigm: ['functional'],
        level: ['intermediate'],
        framework: [],
        library: [],
        useCase: [],
        category: ['official'],
        health: [],
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
      updatedAt: '2026-10-08',
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
      comparisons: [{ language: 'go', name: 'strategy-go' }],
      tourSteps: ['The growing switch'],
      base: 'strategy-base-ts',
      parent: undefined,
      exercises: [{ name: 'implement-express', kind: 'refactor', title: 'Implement express' }],
      health: undefined,
      alternatives: '/templates?topic=design-pattern%2Fbehavioral%2Fstrategy',
    })
  })

  it('gives the health of the template and the link to its run', () => {
    const index = hubIndex()
    const broken = {
      ...index,
      templates: index.templates.map((template) =>
        template.name === 'strategy-ts'
          ? { ...template, health: templateHealth('broken', { runUrl: 'https://ci.example/runs/1' }) }
          : template
      ),
    }

    expect(templatePageOf(broken, 'strategy-ts')?.health).toEqual({
      status: 'broken',
      runUrl: 'https://ci.example/runs/1',
    })
  })

  it('offers to compare only with the variants that the index holds', () => {
    const index = hubIndex()
    const withKotlin = {
      ...index,
      templates: index.templates.map((template) =>
        template.name === 'strategy-ts'
          ? {
              ...template,
              manifest: { ...template.manifest, variants: { go: 'strategy-go', kotlin: 'strategy-kotlin' } },
            }
          : template
      ),
    }

    expect(templatePageOf(withKotlin, 'strategy-ts')?.comparisons).toEqual([{ language: 'go', name: 'strategy-go' }])
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

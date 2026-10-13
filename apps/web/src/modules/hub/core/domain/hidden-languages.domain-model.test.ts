import { describe, expect, it } from 'vitest'

import { templatePage } from '../../__tests__/hub-index.factory.ts'
import {
  facetsWithout,
  sectionsWithout,
  templatePageWithout,
  templatesWithout,
} from './hidden-languages.domain-model.ts'
import type { ConceptSection, ListedTemplate } from './hub.domain-model.ts'
import { byFacet, type FacetOptions } from './template-filters.domain-model.ts'

const listed = (name: string, language: 'typescript' | 'kotlin'): ListedTemplate => ({
  name,
  title: name,
  summary: '',
  language,
  level: 'intermediate',
  updatedAt: '2026-10-13',
  health: undefined,
  searchText: name,
  values: byFacet(() => []),
})

const link = (language: 'typescript' | 'go' | 'kotlin', name: string) => ({ language, name })

describe('hidden languages', () => {
  it('removes a language from the concept cards, and the cards left with no language', () => {
    const sections: ReadonlyArray<ConceptSection> = [
      {
        category: 'design-pattern',
        families: [],
        concepts: [
          {
            name: 'strategy-ts',
            label: 'Strategy',
            summary: '',
            languages: [link('typescript', 'strategy-ts'), link('kotlin', 'strategy-kotlin')],
          },
          { name: 'visitor-kotlin', label: 'Visitor', summary: '', languages: [link('kotlin', 'visitor-kotlin')] },
        ],
      },
      {
        category: 'architecture',
        families: [],
        concepts: [{ name: 'cqrs-kotlin', label: 'CQRS', summary: '', languages: [link('kotlin', 'cqrs-kotlin')] }],
      },
    ]

    expect(sectionsWithout(sections, ['kotlin'])).toEqual([
      {
        category: 'design-pattern',
        families: [],
        concepts: [
          { name: 'strategy-ts', label: 'Strategy', summary: '', languages: [link('typescript', 'strategy-ts')] },
        ],
      },
    ])
  })

  it('leads a concept with its first language left', () => {
    const sections: ReadonlyArray<ConceptSection> = [
      {
        category: 'design-pattern',
        families: [],
        concepts: [
          {
            name: 'strategy-go',
            label: 'Strategy',
            summary: '',
            languages: [link('go', 'strategy-go'), link('kotlin', 'strategy-kotlin')],
          },
        ],
      },
    ]

    expect(sectionsWithout(sections, ['go'])[0]?.concepts[0]?.name).toBe('strategy-kotlin')
  })

  it('removes the templates and the facet value of a language', () => {
    const templates = [listed('strategy-ts', 'typescript'), listed('strategy-kotlin', 'kotlin')]
    const facets: FacetOptions = {
      topics: [],
      values: [
        { facet: 'language', values: ['typescript', 'kotlin'] },
        { facet: 'level', values: ['intermediate'] },
      ],
    }

    expect(templatesWithout(templates, ['kotlin']).map(({ name }) => name)).toEqual(['strategy-ts'])
    expect(facetsWithout(facets, ['kotlin']).values).toEqual([
      { facet: 'language', values: ['typescript'] },
      { facet: 'level', values: ['intermediate'] },
    ])
  })

  it('removes the variants of a language from a template page', () => {
    const page = templatePage({
      name: 'strategy-ts',
      language: 'typescript',
      languages: [link('typescript', 'strategy-ts'), link('kotlin', 'strategy-kotlin')],
      comparisons: [link('kotlin', 'strategy-kotlin')],
    })

    expect(templatePageWithout(page, ['kotlin'])).toMatchObject({
      languages: [link('typescript', 'strategy-ts')],
      comparisons: [],
    })
  })

  it('changes nothing when no language is hidden', () => {
    const facets: FacetOptions = { topics: [], values: [] }

    expect(facetsWithout(facets, [])).toBe(facets)
  })
})

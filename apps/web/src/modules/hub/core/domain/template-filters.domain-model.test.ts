import type { TemplateHealth } from '@typika/registry-tools/template-health'
import { describe, expect, it } from 'vitest'

import { templateHealth } from '../../../shared/__tests__/registry-index.factory.ts'
import { hubIndex } from '../../__tests__/hub-index.factory.ts'
import { listedTemplatesOf } from './hub.domain-model.ts'
import {
  activeFiltersOf,
  facetOptionsOf,
  filtersOfSearch,
  matchesFilters,
  NO_FILTERS,
  searchOfFilters,
  toggleFilter,
} from './template-filters.domain-model.ts'

const namesMatching = (search: Readonly<Record<string, unknown>>) =>
  listedTemplatesOf(hubIndex())
    .filter((template) => matchesFilters(template, filtersOfSearch(search)))
    .map((template) => template.name)

describe('template filters', () => {
  it('reads comma-separated values and repeated values from the query string', () => {
    expect(filtersOfSearch({ language: 'go,typescript', level: ['beginner'], other: 'x', paradigm: 3 })).toEqual({
      ...NO_FILTERS,
      language: ['go', 'typescript'],
      level: ['beginner'],
      paradigm: ['3'],
    })
  })

  it('writes only the active facets back to the query string', () => {
    expect(searchOfFilters({ ...NO_FILTERS, language: ['go', 'typescript'] })).toEqual({ language: 'go,typescript' })
  })

  it('keeps every template without filters', () => {
    expect(namesMatching({})).toEqual(['hexagonal-ts', 'strategy-ts', 'strategy-go', 'observer-ts'])
  })

  it('matches a branch of the topic tree', () => {
    expect(namesMatching({ topic: 'design-pattern/behavioral' })).toEqual(['strategy-ts', 'strategy-go', 'observer-ts'])
    expect(namesMatching({ topic: 'design-pattern/behav' })).toEqual([])
  })

  it('keeps a template that has any value of a facet and every facet', () => {
    expect(namesMatching({ language: 'go,typescript', level: 'beginner' })).toEqual(['observer-ts'])
    expect(namesMatching({ paradigm: 'functional', topic: 'principle' })).toEqual(['strategy-go'])
  })

  it('toggles a value and lists the active filters', () => {
    const filters = toggleFilter(toggleFilter(NO_FILTERS, 'language', 'go'), 'level', 'beginner')

    expect(activeFiltersOf(toggleFilter(filters, 'language', 'go'))).toEqual([{ facet: 'level', value: 'beginner' }])
  })

  it('offers the topic tree and the values present in the listed templates', () => {
    const options = facetOptionsOf(listedTemplatesOf(hubIndex()), hubIndex().vocabulary.topics)

    expect(options.topics).toEqual([
      { topic: 'architecture', category: 'architecture', families: [] },
      { topic: 'principle', category: 'principle', families: [] },
      {
        topic: 'design-pattern',
        category: 'design-pattern',
        families: [{ topic: 'design-pattern/behavioral', family: 'behavioral' }],
      },
    ])
    expect(options.values).toEqual([
      { facet: 'language', values: ['typescript', 'go'] },
      { facet: 'paradigm', values: ['oop', 'functional'] },
      { facet: 'level', values: ['beginner', 'intermediate'] },
      { facet: 'category', values: ['official'] },
    ])
  })
})

describe('the health facet', () => {
  const index = hubIndex()
  const withHealth = {
    ...index,
    templates: index.templates.map((template) => {
      const health = new Map<string, TemplateHealth['status']>([
        ['hexagonal-ts', 'degraded'],
        ['strategy-go', 'broken'],
        ['observer-ts', 'deprecated'],
      ]).get(template.name)
      return health === undefined ? template : { ...template, health: templateHealth(health) }
    }),
  }
  const namesWithHealth = (search: Readonly<Record<string, unknown>>) =>
    listedTemplatesOf(withHealth)
      .filter((template) => matchesFilters(template, filtersOfSearch(search)))
      .map((template) => template.name)

  it('keeps the healthy, the degraded and the unchecked templates by default', () => {
    expect(NO_FILTERS.health).toEqual(['healthy', 'degraded'])
    expect(namesWithHealth({})).toEqual(['hexagonal-ts', 'strategy-ts'])
  })

  it('shows the broken and the deprecated templates once they are checked', () => {
    expect(namesWithHealth({ health: 'broken,deprecated' })).toEqual(['strategy-go', 'observer-ts'])
  })

  it('keeps every template when no health is checked', () => {
    expect(namesWithHealth({ health: '' })).toEqual(['hexagonal-ts', 'strategy-ts', 'strategy-go', 'observer-ts'])
  })

  it('writes the health to the query string only when it differs from the default', () => {
    expect(searchOfFilters(NO_FILTERS)).toEqual({})
    expect(searchOfFilters(toggleFilter(NO_FILTERS, 'health', 'broken'))).toEqual({
      health: 'healthy,degraded,broken',
    })
    expect(searchOfFilters({ ...NO_FILTERS, health: [] })).toEqual({ health: '' })
  })

  it('lists the health as an active filter only when it differs from the default', () => {
    expect(activeFiltersOf(NO_FILTERS)).toEqual([])
    expect(activeFiltersOf(toggleFilter(NO_FILTERS, 'health', 'degraded'))).toEqual([
      { facet: 'health', value: 'healthy' },
    ])
  })

  it('offers the health values in their order of severity', () => {
    expect(facetOptionsOf(listedTemplatesOf(withHealth), withHealth.vocabulary.topics).values).toContainEqual({
      facet: 'health',
      values: ['degraded', 'broken', 'deprecated'],
    })
  })
})

import { describe, expect, it } from 'vitest'

import { hubIndex } from '../../__tests__/hub-index.factory.ts'
import { listedTemplatesOf } from './hub.domain-model.ts'
import { NO_FILTERS } from './template-filters.domain-model.ts'
import {
  facetCountsOf,
  NO_QUERY,
  queryOfSearch,
  resultsOf,
  searchOfQuery,
  withText,
  type TemplateQuery,
} from './template-query.domain-model.ts'

const TEMPLATES = listedTemplatesOf(hubIndex())

const query = (overrides: Partial<TemplateQuery> = {}): TemplateQuery => ({
  filters: NO_FILTERS,
  text: '',
  sort: 'catalogue',
  ...overrides,
})

const namesOf = (overrides: Partial<TemplateQuery>) => resultsOf(TEMPLATES, query(overrides)).map(({ name }) => name)

describe('template query', () => {
  it('lists the templates in the order of the catalogue by default', () => {
    expect(namesOf({})).toEqual(['hexagonal-ts', 'strategy-ts', 'strategy-go', 'observer-ts'])
  })

  it('keeps the templates whose search text has a word starting with every term', () => {
    expect(namesOf({ text: 'switch' })).toEqual(['strategy-ts', 'strategy-go'])
    expect(namesOf({ text: 'Swi  STRAT' })).toEqual(['strategy-ts', 'strategy-go'])
    expect(namesOf({ text: 'switch ports' })).toEqual([])
    expect(namesOf({ text: '  ' })).toHaveLength(4)
  })

  it('combines the search with the facets', () => {
    expect(namesOf({ text: 'switch', filters: { ...NO_FILTERS, language: ['go'] } })).toEqual(['strategy-go'])
  })

  it('ranks whole words above prefixes, then keeps the order of the catalogue', () => {
    expect(namesOf({ text: 'switch', sort: 'relevance' })).toEqual(['strategy-go', 'strategy-ts'])
    expect(namesOf({ text: 'strategy', sort: 'relevance' })).toEqual(['strategy-ts', 'strategy-go'])
  })

  it('sorts by the last update, then by the catalogue', () => {
    expect(namesOf({ sort: 'updated' })).toEqual(['hexagonal-ts', 'observer-ts', 'strategy-ts', 'strategy-go'])
  })

  it('reads the search and the sort from the query string, relevance first when there is a search', () => {
    expect(queryOfSearch({ q: 'switch ', language: 'go' })).toEqual({
      filters: { ...NO_FILTERS, language: ['go'] },
      text: 'switch ',
      sort: 'relevance',
    })
    expect(queryOfSearch({ q: '  ', sort: 'relevance' }).sort).toBe('catalogue')
    expect(queryOfSearch({ sort: 'updated' }).sort).toBe('updated')
    expect(queryOfSearch({ sort: 'relevance' }).sort).toBe('catalogue')
    expect(queryOfSearch({ q: 'switch', sort: 'catalogue' }).sort).toBe('catalogue')
    expect(queryOfSearch({ sort: 'random', q: 3 })).toEqual(query())
  })

  it('writes the search and a sort other than the default back to the query string', () => {
    expect(
      searchOfQuery(query({ text: 'switch', sort: 'relevance', filters: { ...NO_FILTERS, level: ['beginner'] } }))
    ).toEqual({ level: 'beginner', q: 'switch' })
    expect(searchOfQuery(query({ text: 'switch', sort: 'catalogue' }))).toEqual({ q: 'switch', sort: 'catalogue' })
    expect(searchOfQuery(query({ sort: 'updated' }))).toEqual({ sort: 'updated' })
    expect(searchOfQuery(query({ text: ' ' }))).toEqual({})
    expect(searchOfQuery(NO_QUERY)).toEqual({})
  })

  it('moves to relevance when a search starts, unless another sort was chosen', () => {
    expect(withText(query(), 's').sort).toBe('relevance')
    expect(withText(query({ text: 's', sort: 'relevance' }), '').sort).toBe('catalogue')
    expect(withText(query({ sort: 'updated' }), 's').sort).toBe('updated')
    expect(withText(query({ text: 's', sort: 'catalogue' }), 'sw')).toMatchObject({ text: 'sw', sort: 'catalogue' })
  })

  it('counts each facet value against the search and the other facets', () => {
    const counts = facetCountsOf(
      TEMPLATES,
      query({ text: 'strategy', filters: { ...NO_FILTERS, language: ['go'], paradigm: ['functional'] } })
    )

    expect(counts.language).toEqual({ typescript: 0, go: 1 })
    expect(counts.paradigm).toEqual({ functional: 1, oop: 0 })
    expect(counts.topic).toMatchObject({
      'design-pattern': 1,
      'design-pattern/behavioral': 1,
      principle: 1,
      architecture: 0,
    })
  })
})

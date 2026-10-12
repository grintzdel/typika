import { Facet, FACETS } from './constants/facet.constant.ts'
import { TemplateSort } from './constants/template-sort.constant.ts'
import type { ListedTemplate } from './hub.domain-model.ts'
import {
  byFacet,
  filtersOfSearch,
  matchesFacet,
  NO_FILTERS,
  searchOfFilters,
  type TemplateFilters,
} from './template-filters.domain-model.ts'

export type TemplateQuery = {
  readonly filters: TemplateFilters
  readonly text: string
  readonly sort: TemplateSort
}

export type FacetCounts = Readonly<Record<Facet, Readonly<Record<string, number>>>>

const WORD_SEPARATOR = /[^\p{L}\p{N}-]+/u

const termsOf = (text: string) =>
  text
    .toLowerCase()
    .split(WORD_SEPARATOR)
    .filter((term) => term !== '')

export const NO_QUERY: TemplateQuery = { filters: NO_FILTERS, text: '', sort: TemplateSort.CATALOGUE }

const isBlank = (text: string) => text.trim() === ''

const defaultSortOf = (text: string) => (isBlank(text) ? TemplateSort.CATALOGUE : TemplateSort.RELEVANCE)

const sortOfParam = (param: unknown, text: string): TemplateSort => {
  if (param === TemplateSort.UPDATED || param === TemplateSort.CATALOGUE) return param
  if (param === TemplateSort.RELEVANCE && !isBlank(text)) return param
  return defaultSortOf(text)
}

export const queryOfSearch = (search: Readonly<Record<string, unknown>>): TemplateQuery => {
  const text = typeof search['q'] === 'string' ? search['q'] : ''
  return { filters: filtersOfSearch(search), text, sort: sortOfParam(search['sort'], text) }
}

export const searchOfQuery = ({ filters, text, sort }: TemplateQuery): Readonly<Record<string, string>> => ({
  ...searchOfFilters(filters),
  ...(isBlank(text) ? {} : { q: text }),
  ...(sort === defaultSortOf(text) ? {} : { sort }),
})

export const withText = (query: TemplateQuery, text: string): TemplateQuery => ({
  ...query,
  text,
  sort: query.sort === defaultSortOf(query.text) ? defaultSortOf(text) : sortOfParam(query.sort, text),
})

const scoreOf = (template: ListedTemplate, terms: ReadonlyArray<string>): number | undefined => {
  const words = template.searchText.split(' ')
  let score = 0
  for (const term of terms) {
    if (words.includes(term)) score += 2
    else if (words.some((word) => word.startsWith(term))) score += 1
    else return undefined
  }
  return score
}

const matchesFacetsBut = (template: ListedTemplate, filters: TemplateFilters, skipped?: Facet) =>
  FACETS.every((facet) => facet === skipped || matchesFacet(template, facet, filters[facet]))

const scoredOf = (templates: ReadonlyArray<ListedTemplate>, text: string) => {
  const terms = termsOf(text)
  return templates.flatMap((template) => {
    const score = scoreOf(template, terms)
    return score === undefined ? [] : [{ template, score }]
  })
}

export const resultsOf = (templates: ReadonlyArray<ListedTemplate>, query: TemplateQuery) => {
  const scored = scoredOf(templates, query.text).filter(({ template }) => matchesFacetsBut(template, query.filters))
  const sorted =
    query.sort === TemplateSort.RELEVANCE
      ? scored.toSorted((a, b) => b.score - a.score)
      : query.sort === TemplateSort.UPDATED
        ? scored.toSorted((a, b) => b.template.updatedAt.localeCompare(a.template.updatedAt))
        : scored
  return sorted.map(({ template }) => template)
}

const countedValuesOf = (template: ListedTemplate, facet: Facet) =>
  facet === Facet.TOPIC
    ? template.values.topic.flatMap((topic) =>
        topic
          .split('/')
          .slice(0, 2)
          .map((_, depth, parts) => parts.slice(0, depth + 1).join('/'))
      )
    : template.values[facet]

export const facetCountsOf = (templates: ReadonlyArray<ListedTemplate>, query: TemplateQuery): FacetCounts => {
  const searched = scoredOf(templates, query.text).map(({ template }) => template)
  const countsOf = (facet: Facet) => {
    const counts: Record<string, number> = {}
    for (const template of templates)
      for (const value of countedValuesOf(template, facet)) counts[value] = counts[value] ?? 0
    for (const template of searched.filter((candidate) => matchesFacetsBut(candidate, query.filters, facet)))
      for (const value of new Set(countedValuesOf(template, facet))) counts[value] = (counts[value] ?? 0) + 1
    return counts
  }
  return byFacet(countsOf)
}

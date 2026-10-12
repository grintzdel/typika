import { Language, Level, Paradigm } from '@typika/manifest'

import { Facet, FACETS } from './constants/facet.constant.ts'
import type { IndexTopic, ListedTemplate } from './hub.domain-model.ts'

export type TemplateFilters = Readonly<Record<Facet, ReadonlyArray<string>>>

export type ActiveFilter = { readonly facet: Facet; readonly value: string }

export type TopicOption = {
  readonly topic: string
  readonly category: string
  readonly families: ReadonlyArray<{ readonly topic: string; readonly family: string }>
}

export type FacetOptions = {
  readonly topics: ReadonlyArray<TopicOption>
  readonly values: ReadonlyArray<{ readonly facet: Facet; readonly values: ReadonlyArray<string> }>
}

const byFacet = <A>(valueOf: (facet: Facet) => A): Readonly<Record<Facet, A>> => ({
  topic: valueOf(Facet.TOPIC),
  language: valueOf(Facet.LANGUAGE),
  paradigm: valueOf(Facet.PARADIGM),
  level: valueOf(Facet.LEVEL),
  framework: valueOf(Facet.FRAMEWORK),
  library: valueOf(Facet.LIBRARY),
  useCase: valueOf(Facet.USE_CASE),
  category: valueOf(Facet.CATEGORY),
})

export const NO_FILTERS: TemplateFilters = byFacet(() => [])

const VALUE_ORDER: Partial<Record<Facet, ReadonlyArray<string>>> = {
  language: Object.values(Language),
  paradigm: Object.values(Paradigm),
  level: Object.values(Level),
}

const valuesOfParam = (param: unknown): ReadonlyArray<string> => {
  if (Array.isArray(param)) return param.flatMap(valuesOfParam)
  if (typeof param !== 'string' && typeof param !== 'number') return []
  return String(param)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
}

export const filtersOfSearch = (search: Readonly<Record<string, unknown>>): TemplateFilters =>
  byFacet((facet) => [...new Set(valuesOfParam(search[facet]))])

export const searchOfFilters = (filters: TemplateFilters): Readonly<Partial<Record<Facet, string>>> =>
  Object.fromEntries(
    FACETS.filter((facet) => filters[facet].length > 0).map((facet) => [facet, filters[facet].join(',')])
  )

const isWithinTopic = (topic: string, selected: string) => topic === selected || topic.startsWith(`${selected}/`)

export const matchesFilters = (template: ListedTemplate, filters: TemplateFilters): boolean =>
  FACETS.every((facet) => {
    const selected = filters[facet]
    if (selected.length === 0) return true
    const values = template.values[facet]
    return facet === Facet.TOPIC
      ? selected.some((topic) => values.some((value) => isWithinTopic(value, topic)))
      : selected.some((value) => values.includes(value))
  })

export const toggleFilter = (filters: TemplateFilters, facet: Facet, value: string): TemplateFilters => ({
  ...filters,
  [facet]: filters[facet].includes(value)
    ? filters[facet].filter((selected) => selected !== value)
    : [...filters[facet], value],
})

export const activeFiltersOf = (filters: TemplateFilters): ReadonlyArray<ActiveFilter> =>
  FACETS.flatMap((facet) => filters[facet].map((value) => ({ facet, value })))

const topicOptionsOf = (
  templates: ReadonlyArray<ListedTemplate>,
  topics: ReadonlyArray<IndexTopic>
): ReadonlyArray<TopicOption> => {
  const used = new Set(templates.flatMap((template) => template.values.topic))
  const options = new Map<string, Array<{ topic: string; family: string }>>()
  for (const topic of topics.filter(({ id }) => used.has(id))) {
    const families = options.get(topic.category) ?? []
    options.set(topic.category, families)
    const path = `${topic.category}/${topic.family ?? ''}`
    if (topic.family !== undefined && !families.some(({ topic: known }) => known === path))
      families.push({ topic: path, family: topic.family })
  }
  return [...options].map(([category, families]) => ({ topic: category, category, families }))
}

const ordered = (facet: Facet, values: ReadonlySet<string>) => {
  const order = VALUE_ORDER[facet]
  return order === undefined
    ? [...values].toSorted()
    : [...values].toSorted((a, b) => order.indexOf(a) - order.indexOf(b))
}

export const facetOptionsOf = (
  templates: ReadonlyArray<ListedTemplate>,
  topics: ReadonlyArray<IndexTopic>
): FacetOptions => ({
  topics: topicOptionsOf(templates, topics),
  values: FACETS.filter((facet) => facet !== Facet.TOPIC)
    .map((facet) => ({
      facet,
      values: ordered(facet, new Set(templates.flatMap((template) => template.values[facet]))),
    }))
    .filter(({ values }) => values.length > 0),
})

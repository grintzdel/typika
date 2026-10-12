import { useHydrated, useNavigate } from '@tanstack/react-router'

import type { Facet } from '../../core/domain/constants/facet.constant.ts'
import type { TemplateSort } from '../../core/domain/constants/template-sort.constant.ts'
import type { ListedTemplate } from '../../core/domain/hub.domain-model.ts'
import { activeFiltersOf, toggleFilter } from '../../core/domain/template-filters.domain-model.ts'
import {
  facetCountsOf,
  NO_QUERY,
  queryOfSearch,
  resultsOf,
  searchOfQuery,
  withText,
  type TemplateQuery,
} from '../../core/domain/template-query.domain-model.ts'

export const useTemplateFilters = (
  search: Readonly<Record<string, unknown>>,
  templates: ReadonlyArray<ListedTemplate>
) => {
  const navigate = useNavigate()
  const isHydrated = useHydrated()
  const query = isHydrated ? queryOfSearch(search) : NO_QUERY
  const show = (next: TemplateQuery, replace = false) =>
    void navigate({ to: '/templates', search: searchOfQuery(next), replace })
  return {
    filters: query.filters,
    text: query.text,
    sort: query.sort,
    results: resultsOf(templates, query),
    counts: facetCountsOf(templates, query),
    active: activeFiltersOf(query.filters),
    handleToggle: (facet: Facet, value: string) =>
      show({ ...query, filters: toggleFilter(query.filters, facet, value) }),
    handleSearch: (text: string) => show(withText(query, text), true),
    handleSort: (sort: TemplateSort) => show({ ...query, sort }),
    handleClearSearch: () => show(withText(query, '')),
    handleReset: () => show(NO_QUERY),
  }
}

import { useHydrated, useNavigate } from '@tanstack/react-router'

import type { Facet } from '../../core/domain/constants/facet.constant.ts'
import type { ListedTemplate } from '../../core/domain/hub.domain-model.ts'
import {
  activeFiltersOf,
  filtersOfSearch,
  matchesFilters,
  NO_FILTERS,
  searchOfFilters,
  toggleFilter,
  type TemplateFilters,
} from '../../core/domain/template-filters.domain-model.ts'

export const useTemplateFilters = (
  search: Readonly<Record<string, unknown>>,
  templates: ReadonlyArray<ListedTemplate>
) => {
  const navigate = useNavigate()
  const isHydrated = useHydrated()
  const filters = isHydrated ? filtersOfSearch(search) : NO_FILTERS
  const show = (next: TemplateFilters) => void navigate({ to: '/templates', search: searchOfFilters(next) })
  return {
    filters,
    results: templates.filter((template) => matchesFilters(template, filters)),
    active: activeFiltersOf(filters),
    handleToggle: (facet: Facet, value: string) => show(toggleFilter(filters, facet, value)),
    handleReset: () => show(NO_FILTERS),
  }
}

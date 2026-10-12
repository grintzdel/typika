import { useTranslation } from 'react-i18next'

import type { ListedTemplate } from '../../../modules/hub/core/domain/hub.domain-model.ts'
import type { FacetOptions } from '../../../modules/hub/core/domain/template-filters.domain-model.ts'
import { EmptyResults } from '../../../modules/hub/ui/components/EmptyResults.tsx'
import { FacetFilters } from '../../../modules/hub/ui/components/FacetFilters.tsx'
import { HubHeader } from '../../../modules/hub/ui/components/HubHeader.tsx'
import { TemplateCards } from '../../../modules/hub/ui/components/TemplateCards.tsx'
import { useTemplateFilters } from '../../../modules/hub/ui/hooks/use-template-filters.ts'

export type TemplatesPageProps = {
  readonly templates: ReadonlyArray<ListedTemplate>
  readonly facets: FacetOptions
  readonly search: Readonly<Record<string, unknown>>
}

export const TemplatesPage = ({ templates, facets, search }: TemplatesPageProps) => {
  const { t } = useTranslation('hub')
  const list = useTemplateFilters(search, templates)
  return (
    <>
      <HubHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[14rem_1fr]">
        <h1 className="text-2xl font-semibold md:col-span-2">{t('list.title')}</h1>
        <FacetFilters options={facets} filters={list.filters} onToggle={list.handleToggle} />
        {list.results.length === 0 ? (
          <EmptyResults active={list.active} onRemove={list.handleToggle} onReset={list.handleReset} />
        ) : (
          <TemplateCards templates={list.results} />
        )}
      </main>
    </>
  )
}

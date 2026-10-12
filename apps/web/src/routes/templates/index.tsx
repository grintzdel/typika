import { createFileRoute } from '@tanstack/react-router'

import { HubErrorPage } from '../../features/hub/hub-error.page.tsx'
import { loadTemplates, validateTemplatesSearch } from '../../features/hub/hub.loaders.ts'
import { HubPendingPage } from '../../features/hub/hub-pending.page.tsx'
import { TemplatesPage } from '../../features/hub/templates/templates.page.tsx'

const TemplatesRoute = () => {
  const { templates, facets } = Route.useLoaderData()
  return <TemplatesPage templates={templates} facets={facets} search={Route.useSearch()} />
}

export const Route = createFileRoute('/templates/')({
  validateSearch: validateTemplatesSearch,
  loader: loadTemplates,
  component: TemplatesRoute,
  pendingComponent: HubPendingPage,
  errorComponent: HubErrorPage,
})

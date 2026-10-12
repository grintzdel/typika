import { createFileRoute } from '@tanstack/react-router'

import { HubErrorPage } from '../../features/hub/hub-error.page.tsx'
import { loadTemplatePage } from '../../features/hub/hub.loaders.ts'
import { HubPendingPage } from '../../features/hub/hub-pending.page.tsx'
import { TemplateDetailPage, TemplateNotFoundPage } from '../../features/hub/templates/$name/template.page.tsx'

export const Route = createFileRoute('/templates/$name')({
  loader: ({ params }) => loadTemplatePage(params.name),
  component: () => <TemplateDetailPage page={Route.useLoaderData()} />,
  notFoundComponent: () => <TemplateNotFoundPage name={Route.useParams().name} />,
  pendingComponent: HubPendingPage,
  errorComponent: HubErrorPage,
})

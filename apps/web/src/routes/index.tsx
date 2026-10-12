import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '../features/hub/home.page.tsx'
import { HubErrorPage } from '../features/hub/hub-error.page.tsx'
import { HubPendingPage } from '../features/hub/hub-pending.page.tsx'
import { loadHome } from '../features/hub/hub.loaders.ts'

export const Route = createFileRoute('/')({
  loader: loadHome,
  component: () => <HomePage sections={Route.useLoaderData()} />,
  pendingComponent: HubPendingPage,
  errorComponent: HubErrorPage,
})

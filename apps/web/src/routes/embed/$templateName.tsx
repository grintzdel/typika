import { createFileRoute } from '@tanstack/react-router'

import { EmbedPage } from '../../features/embed/embed.page.tsx'
import { embedOptionsOf } from '../../modules/embed/core/domain/embed.domain-model.ts'

const EmbedRoute = () => {
  const { templateName } = Route.useParams()
  return <EmbedPage key={templateName} templateName={templateName} options={embedOptionsOf(Route.useSearch())} />
}

export const Route = createFileRoute('/embed/$templateName')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => search,
  component: EmbedRoute,
})

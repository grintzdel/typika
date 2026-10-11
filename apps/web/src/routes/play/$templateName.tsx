import { createFileRoute } from '@tanstack/react-router'

import { PlayTemplatePage } from '../../features/play/play-template.page.tsx'

type PlaySearch = { readonly exercise?: string }

const PlayRoute = () => {
  const { templateName } = Route.useParams()
  const { exercise } = Route.useSearch()
  return <PlayTemplatePage key={`${templateName}#${exercise ?? ''}`} templateName={templateName} exercise={exercise} />
}

export const Route = createFileRoute('/play/$templateName')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): PlaySearch =>
    typeof search.exercise === 'string' ? { exercise: search.exercise } : {},
  component: PlayRoute,
})

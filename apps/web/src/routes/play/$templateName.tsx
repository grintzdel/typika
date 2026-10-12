import { createFileRoute } from '@tanstack/react-router'

import { PlayTemplatePage } from '../../features/play/play-template.page.tsx'

type PlaySearch = { readonly exercise?: string; readonly panel?: 'diff' }

const PlayRoute = () => {
  const { templateName } = Route.useParams()
  const { exercise, panel } = Route.useSearch()
  return (
    <PlayTemplatePage
      key={`${templateName}#${exercise ?? ''}`}
      templateName={templateName}
      exercise={exercise}
      initialPanel={panel}
    />
  )
}

export const Route = createFileRoute('/play/$templateName')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): PlaySearch => ({
    ...(typeof search.exercise === 'string' ? { exercise: search.exercise } : {}),
    ...(search.panel === 'diff' ? { panel: 'diff' } : {}),
  }),
  component: PlayRoute,
})

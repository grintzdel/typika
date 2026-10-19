import { createFileRoute } from '@tanstack/react-router'

import { PlayTemplatePage } from '../../features/play/play-template.page.tsx'
import { projectKeyOf } from '../../modules/project/core/domain/project.domain-model.ts'

type PlaySearch = { readonly exercise?: string; readonly panel?: 'diff' }

const PlayRoute = () => {
  const { templateName } = Route.useParams()
  const { exercise, panel } = Route.useSearch()
  const projectKey = projectKeyOf(templateName, exercise)
  return <PlayTemplatePage key={projectKey} projectKey={projectKey} initialPanel={panel} />
}

export const Route = createFileRoute('/play/$templateName')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): PlaySearch => ({
    ...(typeof search.exercise === 'string' ? { exercise: search.exercise } : {}),
    ...(search.panel === 'diff' ? { panel: 'diff' } : {}),
  }),
  component: PlayRoute,
})

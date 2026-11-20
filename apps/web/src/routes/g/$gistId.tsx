import { createFileRoute } from '@tanstack/react-router'

import { PlayTemplatePage } from '../../features/play/play-template.page.tsx'
import { gistProjectKeyOf } from '../../modules/project/core/domain/project.domain-model.ts'

const GistRoute = () => {
  const projectKey = gistProjectKeyOf(Route.useParams().gistId)
  return <PlayTemplatePage key={projectKey} projectKey={projectKey} initialPanel={undefined} />
}

export const Route = createFileRoute('/g/$gistId')({
  ssr: false,
  component: GistRoute,
})

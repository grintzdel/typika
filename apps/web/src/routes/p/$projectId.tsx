import { createFileRoute } from '@tanstack/react-router'

import { PlayTemplatePage } from '../../features/play/play-template.page.tsx'
import { storedProjectKeyOf } from '../../modules/project/core/domain/project.domain-model.ts'

const ProjectRoute = () => {
  const projectKey = storedProjectKeyOf(Route.useParams().projectId)
  return <PlayTemplatePage key={projectKey} projectKey={projectKey} initialPanel={undefined} />
}

export const Route = createFileRoute('/p/$projectId')({
  ssr: false,
  component: ProjectRoute,
})

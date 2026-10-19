import { createFileRoute, useRouterState } from '@tanstack/react-router'

import { PlayTemplatePage } from '../features/play/play-template.page.tsx'
import { sharedProjectKeyOf } from '../modules/project/core/domain/project.domain-model.ts'

const SharedRoute = () => {
  const projectKey = sharedProjectKeyOf(useRouterState({ select: (state) => state.location.hash }))
  return <PlayTemplatePage key={projectKey} projectKey={projectKey} initialPanel={undefined} />
}

export const Route = createFileRoute('/s')({
  ssr: false,
  component: SharedRoute,
})

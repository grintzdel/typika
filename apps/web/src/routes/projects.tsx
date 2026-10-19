import { createFileRoute } from '@tanstack/react-router'

import { ProjectsPage } from '../features/projects/projects.page.tsx'

export const Route = createFileRoute('/projects')({
  ssr: false,
  component: ProjectsPage,
})

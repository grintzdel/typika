import { createFileRoute } from '@tanstack/react-router'

import { ProjectsPage } from '../features/projects/projects.page.tsx'

type ProjectsSearch = { readonly new?: string }

const ProjectsRoute = () => <ProjectsPage initialTemplate={Route.useSearch().new} />

export const Route = createFileRoute('/projects')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): ProjectsSearch =>
    typeof search.new === 'string' ? { new: search.new } : {},
  component: ProjectsRoute,
})

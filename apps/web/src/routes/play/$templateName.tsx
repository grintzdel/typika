import { createFileRoute } from '@tanstack/react-router'

import { PlayTemplatePage } from '../../features/play/play-template.page.tsx'

export const Route = createFileRoute('/play/$templateName')({
  ssr: false,
  component: () => <PlayTemplatePage templateName={Route.useParams().templateName} />,
})

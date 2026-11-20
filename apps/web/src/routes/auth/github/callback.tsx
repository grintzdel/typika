import { createFileRoute } from '@tanstack/react-router'

import { GitHubCallbackPage } from '../../../features/auth/github-callback.page.tsx'

export const Route = createFileRoute('/auth/github/callback')({
  ssr: false,
  component: GitHubCallbackPage,
})

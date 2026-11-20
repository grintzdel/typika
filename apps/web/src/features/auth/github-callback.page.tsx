import { GitHubCallbackStatus } from '../../modules/github/ui/components/GitHubCallbackStatus.tsx'
import { useGitHubCallback } from '../../modules/github/ui/hooks/use-github-callback.ts'

// A full navigation: the sandbox routes need their isolation headers.
const returnTo = (path: string) => window.location.replace(path)

export const GitHubCallbackPage = () => {
  const callback = useGitHubCallback(window.location.search, returnTo)
  return <GitHubCallbackStatus failure={callback.failure} />
}

const RESUME_KEY = 'typika:github:resume'

export const GitHubIntent = {
  SHARE_GIST: 'share-gist',
  PUSH_REPOSITORY: 'push-repository',
} as const
export type GitHubIntent = (typeof GitHubIntent)[keyof typeof GitHubIntent]

const resumeOf = (intent: string, path: string) => `${intent} ${path}`

export const markGitHubResume = (intent: string, path: string) => {
  try {
    sessionStorage.setItem(RESUME_KEY, resumeOf(intent, path))
  } catch {
    return
  }
}

export const isGitHubResume = (intent: GitHubIntent, path: string): boolean => {
  try {
    return sessionStorage.getItem(RESUME_KEY) === resumeOf(intent, path)
  } catch {
    return false
  }
}

export const clearGitHubResume = () => {
  try {
    sessionStorage.removeItem(RESUME_KEY)
  } catch {
    return
  }
}

export const currentPath = (): string => `${window.location.pathname}${window.location.search}${window.location.hash}`

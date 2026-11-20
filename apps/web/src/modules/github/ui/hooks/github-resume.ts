const RESUME_KEY = 'typika:github:resume'

export const markGitHubResume = (path: string) => {
  try {
    sessionStorage.setItem(RESUME_KEY, path)
  } catch {
    return
  }
}

export const isGitHubResume = (path: string): boolean => {
  try {
    return sessionStorage.getItem(RESUME_KEY) === path
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

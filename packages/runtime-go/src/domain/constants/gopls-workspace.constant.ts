export const GoplsWorkspace = {
  ROOT: '/work',
  GOROOT: '/goroot',
  HOME: '/home',
  MEMORY_LIMIT: '256MiB',
} as const

export const GOPLS_ROOT_URI = `file://${GoplsWorkspace.ROOT}`

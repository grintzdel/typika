export const ISOLATED_PATHS = ['/play', '/p', '/compare', '/s']

export const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const

export const APP_HEADERS = {
  'Cross-Origin-Resource-Policy': 'same-origin',
} as const

export const RUNTIME_HEADERS = {
  ...ISOLATION_HEADERS,
  'Cross-Origin-Resource-Policy': 'cross-origin',
} as const

export const isIsolatedPath = (pathname: string) =>
  ISOLATED_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

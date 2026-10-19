import { createHash } from 'node:crypto'

type Headers = Readonly<Record<string, string>>

const ISOLATED_PATHS = ['/play', '/p', '/compare', '/s']

export const isIsolatedPath = (pathname: string) =>
  ISOLATED_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

const SCRIPT = /\.(?:m?js|tsx?)$/

const EMBEDDER_POLICY: Headers = { 'Cross-Origin-Embedder-Policy': 'require-corp' }

const ISOLATION_HEADERS: Headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  ...EMBEDDER_POLICY,
}

export const appHeaders = (pathname: string): Headers => ({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  ...(isIsolatedPath(pathname) ? ISOLATION_HEADERS : {}),
  ...(SCRIPT.test(pathname) ? EMBEDDER_POLICY : {}),
})

export const RUNTIME_HEADERS: Headers = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  ...ISOLATION_HEADERS,
}

const policy = (directives: Readonly<Record<string, ReadonlyArray<string>>>) =>
  Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')};`)
    .join(' ')

export const appContentSecurityPolicy = ({
  runtimeOrigin,
  scriptHashes,
  connectOrigins = [],
  frameAncestors = ["'none'"],
}: {
  readonly runtimeOrigin: string
  readonly scriptHashes: ReadonlyArray<string>
  readonly connectOrigins?: ReadonlyArray<string>
  readonly frameAncestors?: ReadonlyArray<string>
}) =>
  policy({
    'default-src': ["'self'"],
    'script-src': ["'self'", ...scriptHashes],
    'worker-src': ["'self'", 'blob:'],
    'connect-src': ["'self'", ...new Set(connectOrigins)],
    'frame-src': [runtimeOrigin],
    'img-src': ["'self'", 'data:'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': frameAncestors,
  })

export const runtimeContentSecurityPolicy = ({ packageOrigin }: { readonly packageOrigin: string }) =>
  policy({
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'", 'blob:', packageOrigin],
    'worker-src': ["'self'", 'blob:'],
    'connect-src': ["'self'", packageOrigin],
    'frame-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'frame-ancestors': ['*'],
  })

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g

export const inlineScriptHashes = (html: string) =>
  [...html.matchAll(INLINE_SCRIPT)].map(
    ([, content = '']) => `'sha256-${createHash('sha256').update(content).digest('base64')}'`
  )

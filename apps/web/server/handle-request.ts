import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

import { DEFAULT_PACKAGE_URL_TEMPLATE } from '@typika/runtime-browser-js/default-package-url-template'
import { BROTLI_SUFFIX } from '@typika/runtime-go'

import type { PublicConfig } from '../src/modules/shared/core/domain/public-config.domain-model.ts'
import { KOTLIN_COMPILER_PATH } from '../src/modules/shared/core/public-config/public-config-from-env.ts'
import type { KotlinRelay } from './kotlin-relay.ts'
import {
  appContentSecurityPolicy,
  appHeaders,
  inlineScriptHashes,
  RUNTIME_HEADERS,
  runtimeContentSecurityPolicy,
} from './security-headers.ts'

export type AppServer = { readonly fetch: (request: Request) => Promise<Response> }

export type RequestHandlerOptions = {
  readonly config: PublicConfig
  readonly clientDir: string
  readonly runtimeDir: string
  readonly appServer: AppServer
  readonly kotlinRelay?: KotlinRelay
}

const RUNTIME_PREFIX = '/runtime/'
const SHELL_FILE = '_shell.html'
const PAGE_FILE = 'index.html'
const IMMUTABLE = 'public, max-age=31536000, immutable'

const MEDIA_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const PINNED_REGISTRY_PATHS = ['/registry/gh/', '/registry/listing/']

const isImmutable = (pathname: string) =>
  pathname.includes('/assets/') || PINNED_REGISTRY_PATHS.some((prefix) => pathname.startsWith(prefix))

const originOf = (location: string) => (URL.canParse(location) ? [new URL(location).origin] : [])

const isServerRoute = (pathname: string) => pathname === '/config.json' || pathname.startsWith('/api/')

const withHeaders = (response: Response, headers: Readonly<Record<string, string>>) => {
  const merged = new Headers(response.headers)
  for (const [name, value] of Object.entries(headers)) merged.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged })
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } })

const pathWithin = (root: string, pathname: string, ...segments: ReadonlyArray<string>) => {
  const path = resolve(root, `.${decodeURIComponent(pathname)}`, ...segments)
  return path.startsWith(`${root}${sep}`) ? path : undefined
}

const isFile = async (path: string) => (await stat(path).catch(() => undefined))?.isFile() === true

const acceptsBrotli = (request: Request) =>
  (request.headers.get('Accept-Encoding') ?? '').split(',').some((coding) => coding.trim().split(';')[0] === 'br')

const serveFile = async (root: string, pathname: string, request: Request): Promise<Response | undefined> => {
  const path = pathWithin(root, pathname)
  if (path === undefined || !(await isFile(path))) return undefined
  const compressed = `${path}${BROTLI_SUFFIX}`
  const hasBrotli = await isFile(compressed)
  const brotli = hasBrotli && acceptsBrotli(request)
  return new Response(await readFile(brotli ? compressed : path), {
    headers: {
      'Content-Type': MEDIA_TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': isImmutable(pathname) ? IMMUTABLE : 'no-cache',
      ...(hasBrotli ? { Vary: 'Accept-Encoding' } : {}),
      ...(brotli ? { 'Content-Encoding': 'br' } : {}),
    },
  })
}

const pageResponse = (html: string, policy: string) =>
  new Response(html, {
    headers: {
      'Content-Type': MEDIA_TYPES['.html'] ?? '',
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': policy,
    },
  })

export const makeRequestHandler = async ({
  config,
  clientDir,
  runtimeDir,
  appServer,
  kotlinRelay,
}: RequestHandlerOptions) => {
  const clientRoot = resolve(clientDir)
  const runtimeRoot = resolve(runtimeDir)
  const shell = await readFile(join(clientRoot, SHELL_FILE), 'utf8')
  const runtimeHost = new URL(config.runtimeOrigin).host
  const connectOrigins = [
    config.registryIndexUrl,
    config.templateFileUrlTemplate,
    config.templateListingUrlTemplate,
  ].flatMap(originOf)
  const policyOf = (html: string) =>
    appContentSecurityPolicy({
      runtimeOrigin: config.runtimeOrigin,
      scriptHashes: inlineScriptHashes(html),
      connectOrigins,
    })
  const appPolicy = policyOf(shell)

  const servePrerendered = async (pathname: string) => {
    const path = extname(pathname) === '' ? pathWithin(clientRoot, pathname, PAGE_FILE) : undefined
    const html = path === undefined ? undefined : await readFile(path, 'utf8').catch(() => undefined)
    return html === undefined ? undefined : pageResponse(html, policyOf(html))
  }
  const runtimeHeaders = {
    ...RUNTIME_HEADERS,
    'Content-Security-Policy': runtimeContentSecurityPolicy({
      packageOrigin: new URL(config.packageUrlTemplate ?? DEFAULT_PACKAGE_URL_TEMPLATE).origin,
    }),
  }

  const serveRuntime = async (request: Request, pathname: string) => {
    if (pathname === `${RUNTIME_PREFIX}config.json`)
      return Response.json(config, { headers: { 'Cache-Control': 'no-store' } })
    if (!pathname.startsWith(RUNTIME_PREFIX)) return notFound()
    return (await serveFile(runtimeRoot, pathname.slice(RUNTIME_PREFIX.length - 1), request)) ?? notFound()
  }

  const serveApp = async (request: Request, pathname: string) => {
    if (pathname.startsWith(RUNTIME_PREFIX)) return notFound()
    if (kotlinRelay !== undefined && pathname.startsWith(`${KOTLIN_COMPILER_PATH}/`)) return kotlinRelay(request)
    if (isServerRoute(pathname)) return appServer.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD') return notFound()
    const file =
      extname(pathname) === '.html'
        ? undefined
        : ((await serveFile(clientRoot, pathname, request)) ?? (await servePrerendered(pathname)))
    if (file !== undefined) return file
    if (pathname.startsWith('/assets/')) return notFound()
    return pageResponse(shell, appPolicy)
  }

  return async (request: Request): Promise<Response> => {
    const { host, pathname } = new URL(request.url)
    if (host === runtimeHost) return withHeaders(await serveRuntime(request, pathname), runtimeHeaders)
    const response = await serveApp(request, pathname)
    return withHeaders(response, {
      ...appHeaders(pathname),
      'Content-Security-Policy': response.headers.get('Content-Security-Policy') ?? appPolicy,
    })
  }
}

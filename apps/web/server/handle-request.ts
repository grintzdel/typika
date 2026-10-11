import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

import { DEFAULT_PACKAGE_URL_TEMPLATE } from '@typika/runtime-browser-js/default-package-url-template'

import type { PublicConfig } from '../src/modules/shared/core/domain/public-config.domain-model.ts'
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
}

const RUNTIME_PREFIX = '/runtime/'
const SHELL_FILE = '_shell.html'
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

const isServerRoute = (pathname: string) => pathname === '/config.json' || pathname.startsWith('/api/')

const withHeaders = (response: Response, headers: Readonly<Record<string, string>>) => {
  const merged = new Headers(response.headers)
  for (const [name, value] of Object.entries(headers)) merged.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged })
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } })

const serveFile = async (root: string, pathname: string): Promise<Response | undefined> => {
  const path = resolve(root, `.${decodeURIComponent(pathname)}`)
  if (!path.startsWith(`${root}${sep}`)) return undefined
  const info = await stat(path).catch(() => undefined)
  if (info?.isFile() !== true) return undefined
  return new Response(await readFile(path), {
    headers: {
      'Content-Type': MEDIA_TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': pathname.includes('/assets/') ? IMMUTABLE : 'no-cache',
    },
  })
}

export const makeRequestHandler = async ({ config, clientDir, runtimeDir, appServer }: RequestHandlerOptions) => {
  const clientRoot = resolve(clientDir)
  const runtimeRoot = resolve(runtimeDir)
  const shell = await readFile(join(clientRoot, SHELL_FILE), 'utf8')
  const runtimeHost = new URL(config.runtimeOrigin).host
  const appPolicy = appContentSecurityPolicy({
    runtimeOrigin: config.runtimeOrigin,
    scriptHashes: inlineScriptHashes(shell),
  })
  const runtimeHeaders = {
    ...RUNTIME_HEADERS,
    'Content-Security-Policy': runtimeContentSecurityPolicy({
      packageOrigin: new URL(config.packageUrlTemplate ?? DEFAULT_PACKAGE_URL_TEMPLATE).origin,
    }),
  }

  const serveRuntime = async (pathname: string) => {
    if (pathname === `${RUNTIME_PREFIX}config.json`)
      return Response.json(config, { headers: { 'Cache-Control': 'no-store' } })
    if (!pathname.startsWith(RUNTIME_PREFIX)) return notFound()
    return (await serveFile(runtimeRoot, pathname.slice(RUNTIME_PREFIX.length - 1))) ?? notFound()
  }

  const serveApp = async (request: Request, pathname: string) => {
    if (pathname.startsWith(RUNTIME_PREFIX)) return notFound()
    if (isServerRoute(pathname)) return appServer.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD') return notFound()
    if (pathname !== `/${SHELL_FILE}`) {
      const file = await serveFile(clientRoot, pathname)
      if (file !== undefined) return file
      if (pathname.startsWith('/assets/')) return notFound()
    }
    return new Response(shell, { headers: { 'Content-Type': MEDIA_TYPES['.html'] ?? '', 'Cache-Control': 'no-cache' } })
  }

  return async (request: Request): Promise<Response> => {
    const { host, pathname } = new URL(request.url)
    if (host === runtimeHost) return withHeaders(await serveRuntime(pathname), runtimeHeaders)
    return withHeaders(await serveApp(request, pathname), {
      ...appHeaders(pathname),
      'Content-Security-Policy': appPolicy,
    })
  }
}

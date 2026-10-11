import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { makeRequestHandler } from './handle-request.ts'

const APP = 'https://app.example.org'
const RUNTIME = 'https://run.example.net'
const SHELL = '<!doctype html><script>boot()</script><script type="module" src="/assets/index-abc.js"></script>'

const writeTree = (root: string, files: Readonly<Record<string, string>>) =>
  Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    })
  )

let handle: (request: Request) => Promise<Response>
const appServer = { fetch: vi.fn(async (request: Request) => Response.json({ path: new URL(request.url).pathname })) }

beforeAll(async () => {
  const dist = await mkdtemp(join(tmpdir(), 'typika-dist-'))
  await writeTree(dist, {
    'secret.txt': 'secret',
    'client/_shell.html': SHELL,
    'client/assets/index-abc.js': 'export {}',
    'client/robots.txt': 'User-agent: *',
    'runtime/frame.html': '<!doctype html>',
    'runtime/assets/esbuild-abc.wasm': 'wasm',
  })
  handle = await makeRequestHandler({
    config: { publicUrl: APP, runtimeOrigin: RUNTIME, packageUrlTemplate: 'https://esm.example.com/{name}@{version}' },
    clientDir: join(dist, 'client'),
    runtimeDir: join(dist, 'runtime'),
    appServer,
  })
})

const get = (url: string) => handle(new Request(url))

describe('makeRequestHandler on the app origin', () => {
  it('serves the shell for the app routes, with a policy that allows its inline script', async () => {
    const response = await get(`${APP}/templates`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(SHELL)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-cache')
    expect(response.headers.get('content-security-policy')).toContain(
      "script-src 'self' 'sha256-MeZS89WlF0u+o0hCvHTBt4q1WHU+U+sJKgbdRUc36mY=';"
    )
    expect(response.headers.get('cross-origin-opener-policy')).toBeNull()
  })

  it('isolates the sandbox routes', async () => {
    const response = await get(`${APP}/play/strategy-ts`)

    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(response.headers.get('cross-origin-embedder-policy')).toBe('require-corp')
  })

  it('serves the hashed assets as immutable', async () => {
    const response = await get(`${APP}/assets/index-abc.js`)

    expect(await response.text()).toBe('export {}')
    expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin')
  })

  it('answers 404 for a missing asset instead of the shell', async () => {
    expect((await get(`${APP}/assets/missing-abc.js`)).status).toBe(404)
  })

  it('revalidates the other static files', async () => {
    expect((await get(`${APP}/robots.txt`)).headers.get('cache-control')).toBe('no-cache')
  })

  it('hands the server routes to the app server, with the app headers', async () => {
    const config = await get(`${APP}/config.json`)
    const api = await get(`${APP}/api/github/token`)

    expect(await config.json()).toEqual({ path: '/config.json' })
    expect(await api.json()).toEqual({ path: '/api/github/token' })
    expect(config.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })

  it('does not serve the runtime frame', async () => {
    expect((await get(`${APP}/runtime/frame.html`)).status).toBe(404)
  })

  it('does not serve files outside of its folder', async () => {
    expect(await (await get(`${APP}/assets/..%2f..%2fsecret.txt`)).text()).not.toBe('secret')
  })
})

describe('makeRequestHandler on the runtime origin', () => {
  it('serves the runtime frame with the runtime headers', async () => {
    const response = await get(`${RUNTIME}/runtime/frame.html`)

    expect(response.status).toBe(200)
    expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin')
    expect(response.headers.get('cross-origin-embedder-policy')).toBe('require-corp')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('content-security-policy')).toContain("connect-src 'self' https://esm.example.com;")
  })

  it('serves WebAssembly with its media type', async () => {
    expect((await get(`${RUNTIME}/runtime/assets/esbuild-abc.wasm`)).headers.get('content-type')).toBe(
      'application/wasm'
    )
  })

  it('serves the public configuration to the frame', async () => {
    const response = await get(`${RUNTIME}/runtime/config.json`)

    expect(await response.json()).toEqual({
      publicUrl: APP,
      runtimeOrigin: RUNTIME,
      packageUrlTemplate: 'https://esm.example.com/{name}@{version}',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('serves no page of the app', async () => {
    appServer.fetch.mockClear()

    const statuses = await Promise.all(
      ['/', '/play/strategy-ts', '/config.json', '/assets/index-abc.js'].map(
        async (path) => (await get(`${RUNTIME}${path}`)).status
      )
    )

    expect(statuses).toEqual([404, 404, 404, 404])
    expect(appServer.fetch).not.toHaveBeenCalled()
  })
})

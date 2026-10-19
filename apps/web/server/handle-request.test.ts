import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { makeRequestHandler } from './handle-request.ts'

const APP = 'https://app.example.org'
const RUNTIME = 'https://run.example.net'
const SHELL = '<!doctype html><script>boot()</script><script type="module" src="/assets/index-abc.js"></script>'
const LIST_PAGE = '<!doctype html><main>Templates</main><script>hydrate("list")</script>'

const writeTree = (root: string, files: Readonly<Record<string, string>>) =>
  Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    })
  )

let handle: (request: Request) => Promise<Response>
const appServer = { fetch: vi.fn(async (request: Request) => Response.json({ path: new URL(request.url).pathname })) }
const kotlinRelay = vi.fn(async () => Response.json({ ok: true, diagnostics: [] }))

beforeAll(async () => {
  const dist = await mkdtemp(join(tmpdir(), 'typika-dist-'))
  await writeTree(dist, {
    'secret.txt': 'secret',
    'client/_shell.html': SHELL,
    'client/index.html': '<!doctype html><main>Home</main>',
    'client/templates/index.html': LIST_PAGE,
    'client/templates/strategy-ts/index.html': '<!doctype html><main>Strategy</main>',
    'client/assets/index-abc.js': 'export {}',
    'client/robots.txt': 'User-agent: *',
    'client/registry/index.json': '{}',
    'client/registry/artifacts/kotlin/0123.json': '{"_tag":"Failed","diagnostics":[]}',
    'client/registry/gh/typika/templates@0123456789ab/strategy/ts/typika.toml': 'name = "strategy-ts"',
    'runtime/frame.html': '<!doctype html>',
    'runtime/assets/esbuild-abc.wasm': 'wasm',
    'runtime/assets/go/0123/compile.wasm': 'compile',
    'runtime/assets/go/0123/compile.wasm.br': 'brotli',
  })
  handle = await makeRequestHandler({
    config: {
      publicUrl: APP,
      runtimeOrigin: RUNTIME,
      packageUrlTemplate: 'https://esm.example.com/{name}@{version}',
      registryIndexUrl: '/registry/index.json',
      templateFileUrlTemplate: 'https://cdn.example.com/gh/{owner}/{repo}@{ref}/{path}',
      templateListingUrlTemplate: '/registry/listing/gh/{owner}/{repo}@{ref}.json',
    },
    clientDir: join(dist, 'client'),
    runtimeDir: join(dist, 'runtime'),
    appServer,
    kotlinRelay,
  })
})

const get = (url: string) => handle(new Request(url))

describe('makeRequestHandler on the app origin', () => {
  it('serves the shell for the app routes, with a policy that allows its inline script', async () => {
    const response = await get(`${APP}/projects`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(SHELL)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-cache')
    expect(response.headers.get('content-security-policy')).toContain(
      "script-src 'self' 'sha256-MeZS89WlF0u+o0hCvHTBt4q1WHU+U+sJKgbdRUc36mY=';"
    )
    expect(response.headers.get('cross-origin-opener-policy')).toBeNull()
  })

  it('serves a prerendered page, with a policy that allows its own inline scripts', async () => {
    const response = await get(`${APP}/templates`)

    expect(await response.text()).toBe(LIST_PAGE)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-cache')
    const policy = response.headers.get('content-security-policy')
    expect(policy).toContain("script-src 'self' 'sha256-")
    expect(policy).not.toContain('MeZS89WlF0u+o0hCvHTBt4q1WHU+U+sJKgbdRUc36mY=')
  })

  it('serves the prerendered home page and template pages', async () => {
    expect(await (await get(`${APP}/`)).text()).toContain('Home')
    expect(await (await get(`${APP}/templates/strategy-ts`)).text()).toContain('Strategy')
    expect(await (await get(`${APP}/templates/strategy-ts/`)).text()).toContain('Strategy')
  })

  it('serves the shell for a template page that was not prerendered', async () => {
    expect(await (await get(`${APP}/templates/observer-ts`)).text()).toBe(SHELL)
  })

  it('serves the prerendered pages only at their path', async () => {
    expect(await (await get(`${APP}/templates/index.html`)).text()).toBe(SHELL)
  })

  it('isolates the sandbox routes', async () => {
    const response = await get(`${APP}/play/strategy-ts`)

    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(response.headers.get('cross-origin-embedder-policy')).toBe('require-corp')
  })

  it('lets any page frame the embed, without isolating it', async () => {
    const response = await get(`${APP}/embed/strategy-ts`)

    expect(await response.text()).toBe(SHELL)
    const policy = response.headers.get('content-security-policy')
    expect(policy).toContain('frame-ancestors *;')
    expect(policy).toContain("script-src 'self' 'sha256-MeZS89WlF0u+o0hCvHTBt4q1WHU+U+sJKgbdRUc36mY=';")
    expect(response.headers.get('cross-origin-opener-policy')).toBeNull()
    expect(response.headers.get('cross-origin-embedder-policy')).toBeNull()
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin')
  })

  it('keeps every other page from being framed', async () => {
    const responses = await Promise.all(
      ['/projects', '/play/strategy-ts', '/embed', '/embedded/strategy-ts', '/templates'].map((path) =>
        get(`${APP}${path}`)
      )
    )

    for (const response of responses) {
      expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    }
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

  it('serves the registry index for revalidation and the pinned template files as immutable', async () => {
    const pinned = await get(`${APP}/registry/gh/typika/templates@0123456789ab/strategy/ts/typika.toml`)

    expect((await get(`${APP}/registry/index.json`)).headers.get('cache-control')).toBe('no-cache')
    expect(await pinned.text()).toBe('name = "strategy-ts"')
    expect(pinned.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('serves the precompiled Kotlin artifacts as immutable, and answers 404 for a missing one', async () => {
    const artifact = await get(`${APP}/registry/artifacts/kotlin/0123.json`)

    expect(await artifact.json()).toEqual({ _tag: 'Failed', diagnostics: [] })
    expect(artifact.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect((await get(`${APP}/registry/artifacts/kotlin/4567.json`)).status).toBe(404)
  })

  it('lets the app reach a registry served from another origin', async () => {
    expect((await get(`${APP}/`)).headers.get('content-security-policy')).toContain(
      "connect-src 'self' https://cdn.example.com;"
    )
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

describe('makeRequestHandler for Kotlin', () => {
  it('hands the compile route of the app to the Kotlin relay, with the app headers', async () => {
    const response = await handle(new Request(`${APP}/api/kotlin/compile`, { method: 'POST', body: '{}' }))

    expect(await response.json()).toEqual({ ok: true, diagnostics: [] })
    expect(kotlinRelay).toHaveBeenCalledOnce()
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('does not relay from the runtime origin', async () => {
    kotlinRelay.mockClear()

    const response = await handle(new Request(`${RUNTIME}/api/kotlin/compile`, { method: 'POST', body: '{}' }))

    expect(response.status).toBe(404)
    expect(kotlinRelay).not.toHaveBeenCalled()
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

  it('serves the brotli version of an asset to a browser that accepts it', async () => {
    const response = await handle(
      new Request(`${RUNTIME}/runtime/assets/go/0123/compile.wasm`, { headers: { 'Accept-Encoding': 'gzip, br' } })
    )

    expect(await response.text()).toBe('brotli')
    expect(response.headers.get('content-encoding')).toBe('br')
    expect(response.headers.get('content-type')).toBe('application/wasm')
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('serves the plain asset to a browser that does not accept brotli', async () => {
    const response = await handle(
      new Request(`${RUNTIME}/runtime/assets/go/0123/compile.wasm`, { headers: { 'Accept-Encoding': 'gzip' } })
    )

    expect(await response.text()).toBe('compile')
    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
  })

  it('serves the public configuration to the frame', async () => {
    const response = await get(`${RUNTIME}/runtime/config.json`)

    expect(await response.json()).toMatchObject({
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

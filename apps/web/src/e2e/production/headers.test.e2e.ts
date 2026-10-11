import { expect, test } from '@playwright/test'

import { APP_URL, RUNTIME_URL } from './production-urls.ts'

const ISOLATED_PATHS = ['/play/strategy-ts', '/p/a-project', '/compare', '/s']
const PLAIN_PATHS = ['/', '/templates', '/projects']

const PUBLIC_CONFIG_KEYS = new Set(['publicUrl', 'runtimeOrigin', 'packageUrlTemplate'])

const expectAppHeaders = (headers: Readonly<Record<string, string>>) => {
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['cross-origin-resource-policy']).toBe('same-origin')
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['content-security-policy']).toContain(`frame-src ${new URL(RUNTIME_URL).origin}`)
  expect(headers['content-security-policy']).toContain("object-src 'none'")
}

test.describe('app origin', () => {
  for (const path of ISOLATED_PATHS)
    test(`isolates ${path}`, async ({ request }) => {
      const response = await request.get(`${APP_URL}${path}`)

      expect(response.status()).toBe(200)
      expect(response.headers()['cross-origin-opener-policy']).toBe('same-origin')
      expect(response.headers()['cross-origin-embedder-policy']).toBe('require-corp')
      expectAppHeaders(response.headers())
    })

  for (const path of PLAIN_PATHS)
    test(`serves ${path} without isolation`, async ({ request }) => {
      const response = await request.get(`${APP_URL}${path}`)

      expect(response.status()).toBe(200)
      expect(response.headers()['cross-origin-opener-policy']).toBeUndefined()
      expect(response.headers()['cross-origin-embedder-policy']).toBeUndefined()
      expectAppHeaders(response.headers())
    })

  test('serves the public configuration and nothing else', async ({ request }) => {
    const response = await request.get(`${APP_URL}/config.json`)

    expect(response.status()).toBe(200)
    const body: unknown = await response.json()
    const keys = typeof body === 'object' && body !== null ? Object.keys(body) : []
    expect(keys).toEqual(expect.arrayContaining(['publicUrl', 'runtimeOrigin']))
    expect(keys.filter((key) => !PUBLIC_CONFIG_KEYS.has(key))).toEqual([])
    expectAppHeaders(response.headers())
  })

  test('serves the hashed assets as immutable', async ({ request }) => {
    const shell = await (await request.get(`${APP_URL}/`)).text()
    const asset = /src="(\/assets\/[^"]+\.js)"/.exec(shell)?.[1]
    expect(asset).toBeDefined()

    const response = await request.get(`${APP_URL}${asset ?? ''}`)

    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(response.headers()['content-type']).toContain('text/javascript')
    expect(response.headers()['cross-origin-resource-policy']).toBe('same-origin')
  })

  test('does not serve the runtime frame', async ({ request }) => {
    expect((await request.get(`${APP_URL}/runtime/frame.html`)).status()).toBe(404)
  })
})

test.describe('runtime origin', () => {
  test('serves the runtime frame isolated and embeddable by the app', async ({ request }) => {
    const response = await request.get(`${RUNTIME_URL}/runtime/frame.html`)
    const headers = response.headers()

    expect(response.status()).toBe(200)
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(headers['cross-origin-embedder-policy']).toBe('require-corp')
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-security-policy']).toContain("connect-src 'self'")
    expect(headers['content-security-policy']).toContain('frame-ancestors *')
  })

  test('serves the configuration to the frame', async ({ request }) => {
    const response = await request.get(`${RUNTIME_URL}/runtime/config.json`)

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ publicUrl: APP_URL.replace(/\/$/, '') })
  })

  for (const path of ['/', '/play/strategy-ts', '/config.json'])
    test(`does not serve the app page ${path}`, async ({ request }) => {
      expect((await request.get(`${RUNTIME_URL}${path}`)).status()).toBe(404)
    })
})

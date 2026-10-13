import { describe, expect, it, vi } from 'vitest'

import { makeKotlinRelay, type KotlinRelayOptions } from './kotlin-relay.ts'
import { makeRateLimiter } from './rate-limiter.ts'

const APP = 'https://typika.example.org'
const BODY = JSON.stringify({ protocol: 1, files: [] })

const compileRequest = (init: RequestInit & { readonly path?: string } = {}) =>
  new Request(`${APP}${init.path ?? '/api/kotlin/compile'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP },
    body: BODY,
    ...init,
  })

const relayWith = (overrides: Partial<KotlinRelayOptions> = {}) => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ ok: true, diagnostics: [] }, { status: 200 })
  )
  const relay = makeKotlinRelay({
    upstream: 'http://kotlin-compiler:8080',
    appOrigin: APP,
    limiter: makeRateLimiter({ perMinute: 60, burst: 2 }),
    clientIpOf: () => '1.2.3.4',
    fetch,
    ...overrides,
  })
  return { relay, fetch }
}

describe('makeKotlinRelay', () => {
  it('forwards a compilation to the service and returns its answer', async () => {
    const { relay, fetch } = relayWith()

    const response = await relay(compileRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, diagnostics: [] })
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('http://kotlin-compiler:8080/compile')
    expect(init?.body instanceof Uint8Array ? new TextDecoder().decode(init.body) : init?.body).toBe(BODY)
  })

  it('passes on the status and Retry-After of the service', async () => {
    const { relay } = relayWith({
      fetch: async () =>
        Response.json({ error: 'compilation queue is full' }, { status: 503, headers: { 'retry-after': '5' } }),
    })

    const response = await relay(compileRequest())

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('5')
  })

  it('answers 429 with Retry-After once a client exceeds its rate', async () => {
    const { relay, fetch } = relayWith()
    await relay(compileRequest())
    await relay(compileRequest())

    const response = await relay(compileRequest())

    expect(response.status).toBe(429)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('refuses a body over 256 KiB without calling the service', async () => {
    const { relay, fetch } = relayWith()

    const response = await relay(compileRequest({ body: 'a'.repeat(256 * 1024 + 1) }))

    expect(response.status).toBe(413)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses a request sent from another site', async () => {
    const { relay, fetch } = relayWith()

    const response = await relay(compileRequest({ headers: { origin: 'https://evil.example' } }))

    expect(response.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['another path', { path: '/api/kotlin/run' }, 404],
    ['another method', { method: 'GET', body: null }, 405],
  ])('refuses %s', async (_, init, status) => {
    const { relay } = relayWith()

    expect((await relay(compileRequest(init))).status).toBe(status)
  })

  it('answers 503 when the service cannot be reached', async () => {
    const { relay } = relayWith({ fetch: () => Promise.reject(new TypeError('fetch failed')) })

    expect((await relay(compileRequest())).status).toBe(503)
  })
})

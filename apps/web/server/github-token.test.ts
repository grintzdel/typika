import { describe, expect, it, vi } from 'vitest'

import { gitHubTokenExchangeFromEnv, makeGitHubTokenExchange, type GitHubTokenExchangeOptions } from './github-token.ts'
import { makeRateLimiter } from './rate-limiter.ts'

const APP = 'https://typika.example.org'

const tokenRequest = (init: RequestInit & { readonly path?: string } = {}) =>
  new Request(`${APP}${init.path ?? '/api/github/token'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP },
    body: JSON.stringify({ code: 'the-code', codeVerifier: 'the-verifier' }),
    ...init,
  })

const exchangeWith = (overrides: Partial<GitHubTokenExchangeOptions> = {}) => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ access_token: 'gho_token', scope: 'gist,public_repo', token_type: 'bearer' })
  )
  const exchange = makeGitHubTokenExchange({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    githubUrl: 'https://github.example.com/',
    appOrigin: APP,
    limiter: makeRateLimiter({ perMinute: 60, burst: 2 }),
    clientIpOf: () => '1.2.3.4',
    fetch,
    ...overrides,
  })
  return { exchange, fetch }
}

describe('makeGitHubTokenExchange', () => {
  it('exchanges the code with the client secret and returns the token and its scopes', async () => {
    const { exchange, fetch } = exchangeWith()

    const response = await exchange(tokenRequest())

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ accessToken: 'gho_token', scopes: ['gist', 'public_repo'] })
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://github.example.com/login/oauth/access_token')
    expect(typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'the-code',
      code_verifier: 'the-verifier',
      redirect_uri: `${APP}/auth/github/callback`,
    })
  })

  it('answers 400 when GitHub refuses the code with a 200', async () => {
    const { exchange } = exchangeWith({ fetch: async () => Response.json({ error: 'bad_verification_code' }) })

    const response = await exchange(tokenRequest())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'GitHub refused the code' })
  })

  it('answers 502 when GitHub is unreachable', async () => {
    const { exchange } = exchangeWith({ fetch: async () => Promise.reject(new Error('ECONNREFUSED')) })

    expect((await exchange(tokenRequest())).status).toBe(502)
  })

  it.each([
    ['another origin', { headers: { origin: 'https://evil.example.com' } }],
    ['no origin', { headers: {} }],
  ])('refuses a request from %s without calling GitHub', async (_, init) => {
    const { exchange, fetch } = exchangeWith()

    const response = await exchange(tokenRequest(init))

    expect(response.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['a missing verifier', JSON.stringify({ code: 'the-code' })],
    ['an oversized code', JSON.stringify({ code: 'c'.repeat(513), codeVerifier: 'v' })],
    ['a body that is not JSON', 'code=1'],
  ])('answers 400 on %s', async (_, body) => {
    const { exchange, fetch } = exchangeWith()

    const response = await exchange(tokenRequest({ body }))

    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers 429 with Retry-After once a client exceeds its rate', async () => {
    const { exchange } = exchangeWith()
    await exchange(tokenRequest())
    await exchange(tokenRequest())

    const response = await exchange(tokenRequest())

    expect(response.status).toBe(429)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('answers 405 on GET and 404 on another path', async () => {
    const { exchange } = exchangeWith()

    expect((await exchange(new Request(`${APP}/api/github/token`, { headers: { origin: APP } }))).status).toBe(405)
    expect((await exchange(tokenRequest({ path: '/api/github/other' }))).status).toBe(404)
  })
})

describe('gitHubTokenExchangeFromEnv', () => {
  const ENV = { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'client-secret' }

  it('has no exchange without an OAuth application', () => {
    expect(gitHubTokenExchangeFromEnv({}, APP, 'https://github.com')).toBeUndefined()
    expect(gitHubTokenExchangeFromEnv(ENV, APP, undefined)).toBeUndefined()
  })

  it('lets an instance set its own rate', async () => {
    const exchange = gitHubTokenExchangeFromEnv({ ...ENV, TYPIKA_GITHUB_RATE_BURST: '1' }, APP, 'http://127.0.0.1:9')

    await exchange?.(tokenRequest())

    expect((await exchange?.(tokenRequest()))?.status).toBe(429)
  })
})

import { GITHUB_CALLBACK_PATH, GITHUB_TOKEN_PATH } from '../src/modules/github/core/domain/github-oauth.domain-model.ts'
import { clientIpOf } from './client-ip.ts'
import { makeRateLimiter, type RateLimiter } from './rate-limiter.ts'

export type GitHubTokenExchangeOptions = {
  readonly clientId: string
  readonly clientSecret: string
  readonly githubUrl: string
  readonly appOrigin: string
  readonly limiter: RateLimiter
  readonly clientIpOf: (request: Request) => string
  readonly fetch?: typeof globalThis.fetch
  readonly timeoutMs?: number
}

export type GitHubTokenExchange = (request: Request) => Promise<Response>

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_BODY_BYTES = 4_096
const MAX_FIELD_LENGTH = 512

const error = (status: number, message: string, headers: Readonly<Record<string, string>> = {}) =>
  Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

const field = (body: unknown, name: string): string | undefined => {
  const value: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, name) : undefined
  return typeof value === 'string' && value !== '' && value.length <= MAX_FIELD_LENGTH ? value : undefined
}

const readJson = async (request: Request): Promise<unknown> => {
  const text = await request.text().catch(() => '')
  if (text.length > MAX_BODY_BYTES) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

export const makeGitHubTokenExchange = ({
  clientId,
  clientSecret,
  githubUrl,
  appOrigin,
  limiter,
  clientIpOf: ipOf,
  fetch = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: GitHubTokenExchangeOptions): GitHubTokenExchange => {
  const endpoint = `${githubUrl.replace(/\/+$/, '')}/login/oauth/access_token`

  return async (request) => {
    if (new URL(request.url).pathname !== GITHUB_TOKEN_PATH) return error(404, 'not found')
    if (request.method !== 'POST') return error(405, 'method not allowed', { Allow: 'POST' })
    if (request.headers.get('origin') !== appOrigin) return error(403, 'origin not allowed')
    const decision = limiter.take(ipOf(request))
    if (!decision.allowed) {
      return error(429, 'too many sign-ins', { 'Retry-After': String(decision.retryAfterSeconds) })
    }
    const body = await readJson(request)
    const code = field(body, 'code')
    const codeVerifier = field(body, 'codeVerifier')
    if (code === undefined || codeVerifier === undefined) return error(400, 'code and codeVerifier are required')
    const answer = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${appOrigin}${GITHUB_CALLBACK_PATH}`,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => undefined)
    if (answer === undefined) return error(502, 'GitHub is unreachable')
    const granted: unknown = await answer.json().catch(() => undefined)
    const accessToken = field(granted, 'access_token')
    // GitHub answers 200 with an `error` field when it refuses a code.
    if (!answer.ok || accessToken === undefined) return error(400, 'GitHub refused the code')
    const scope: unknown = typeof granted === 'object' && granted !== null ? Reflect.get(granted, 'scope') : ''
    return Response.json(
      { accessToken, scopes: typeof scope === 'string' ? scope.split(/[\s,]+/).filter((name) => name !== '') : [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

const RATE_PER_MINUTE = 10
const RATE_BURST = 5

export const gitHubTokenExchangeFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
  appOrigin: string,
  githubUrl: string | undefined
): GitHubTokenExchange | undefined => {
  const clientId = env.GITHUB_CLIENT_ID
  const clientSecret = env.GITHUB_CLIENT_SECRET
  if (githubUrl === undefined || clientId === undefined || clientSecret === undefined) return undefined
  return makeGitHubTokenExchange({
    clientId,
    clientSecret,
    githubUrl,
    appOrigin,
    limiter: makeRateLimiter({ perMinute: RATE_PER_MINUTE, burst: RATE_BURST }),
    clientIpOf: clientIpOf({ trustProxy: env.TYPIKA_TRUST_PROXY === 'true' }),
  })
}

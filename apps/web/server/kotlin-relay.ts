import { RuntimeLimit } from '@typika/runtime-core'

import { KOTLIN_COMPILER_PATH } from '../src/modules/shared/core/public-config/public-config-from-env.ts'
import { clientIpOf } from './client-ip.ts'
import { makeRateLimiter, type RateLimiter } from './rate-limiter.ts'

export type KotlinRelayOptions = {
  readonly upstream: string
  readonly appOrigin: string
  readonly limiter: RateLimiter
  readonly clientIpOf: (request: Request) => string
  readonly fetch?: typeof globalThis.fetch
  readonly timeoutMs?: number
}

export type KotlinRelay = (request: Request) => Promise<Response>

const COMPILE_PATH = `${KOTLIN_COMPILER_PATH}/compile`
const DEFAULT_TIMEOUT_MS = RuntimeLimit.KOTLIN_COMPILE_CLIENT_TIMEOUT_MS + 5_000
const MAX_BODY_BYTES = RuntimeLimit.KOTLIN_COMPILE_REQUEST_BYTES
const UNAVAILABLE_RETRY_AFTER_SECONDS = '5'

const error = (status: number, message: string, headers: Readonly<Record<string, string>> = {}) =>
  Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

const readCapped = async (request: Request): Promise<Uint8Array<ArrayBuffer> | undefined> => {
  if (request.body === null) return new Uint8Array(new ArrayBuffer(0))
  const chunks: Array<Uint8Array> = []
  let size = 0
  for await (const chunk of request.body) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(chunk)
  }
  const body = new Uint8Array(new ArrayBuffer(size))
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export const makeKotlinRelay = ({
  upstream,
  appOrigin,
  limiter,
  clientIpOf: ipOf,
  fetch = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: KotlinRelayOptions): KotlinRelay => {
  const endpoint = `${upstream.replace(/\/+$/, '')}/compile`

  return async (request) => {
    if (new URL(request.url).pathname !== COMPILE_PATH) return error(404, 'not found')
    if (request.method !== 'POST') return error(405, 'method not allowed', { Allow: 'POST' })
    const origin = request.headers.get('origin')
    if (origin !== null && origin !== appOrigin) return error(403, 'origin not allowed')
    const decision = limiter.take(ipOf(request))
    if (!decision.allowed) {
      return error(429, 'too many compilations', { 'Retry-After': String(decision.retryAfterSeconds) })
    }
    const body = await readCapped(request)
    if (body === undefined) return error(413, `request body over ${MAX_BODY_BYTES / 1024} KiB`)
    const answer = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => undefined)
    if (answer === undefined) {
      return error(503, 'the Kotlin compiler is unreachable', { 'Retry-After': UNAVAILABLE_RETRY_AFTER_SECONDS })
    }
    const retryAfter = answer.headers.get('retry-after')
    return new Response(await answer.arrayBuffer(), {
      status: answer.status,
      headers: {
        'Content-Type': answer.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
        ...(retryAfter === null ? {} : { 'Retry-After': retryAfter }),
      },
    })
  }
}

const DEFAULT_RATE_PER_MINUTE = 20
const DEFAULT_RATE_BURST = 10

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const kotlinRelayFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
  appOrigin: string
): KotlinRelay | undefined => {
  const upstream = env.KOTLIN_COMPILER_URL
  if (upstream === undefined || upstream === '') return undefined
  return makeKotlinRelay({
    upstream,
    appOrigin,
    limiter: makeRateLimiter({
      perMinute: positiveInt(env.TYPIKA_KOTLIN_RATE_PER_MINUTE, DEFAULT_RATE_PER_MINUTE),
      burst: positiveInt(env.TYPIKA_KOTLIN_RATE_BURST, DEFAULT_RATE_BURST),
    }),
    clientIpOf: clientIpOf({ trustProxy: env.TYPIKA_TRUST_PROXY === 'true' }),
  })
}

export type RateLimit = {
  readonly perMinute: number
  readonly burst: number
  readonly maxClients?: number
}

export type RateDecision = { readonly allowed: true } | { readonly allowed: false; readonly retryAfterSeconds: number }

export type RateLimiter = {
  readonly take: (client: string) => RateDecision
  readonly size: () => number
}

type Bucket = { tokens: number; updatedAt: number }

const DEFAULT_MAX_CLIENTS = 10_000
const MINUTE_MS = 60_000

export const makeRateLimiter = (
  { perMinute, burst, maxClients = DEFAULT_MAX_CLIENTS }: RateLimit,
  now: () => number = Date.now
): RateLimiter => {
  const buckets = new Map<string, Bucket>()
  const perMs = perMinute / MINUTE_MS

  const refill = (bucket: Bucket, at: number) => {
    bucket.tokens = Math.min(burst, bucket.tokens + (at - bucket.updatedAt) * perMs)
    bucket.updatedAt = at
  }

  const prune = (at: number) => {
    for (const [client, bucket] of buckets) {
      if (buckets.size < maxClients) return
      refill(bucket, at)
      if (bucket.tokens >= burst) buckets.delete(client)
    }
    for (const client of buckets.keys()) {
      if (buckets.size < maxClients) return
      buckets.delete(client)
    }
  }

  return {
    take: (client) => {
      const at = now()
      let bucket = buckets.get(client)
      if (bucket === undefined) {
        prune(at)
        bucket = { tokens: burst, updatedAt: at }
        buckets.set(client, bucket)
      }
      refill(bucket, at)
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1
        return { allowed: true }
      }
      return { allowed: false, retryAfterSeconds: Math.ceil((1 - bucket.tokens) / perMs / 1_000) }
    },
    size: () => buckets.size,
  }
}

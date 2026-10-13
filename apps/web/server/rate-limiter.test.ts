import { describe, expect, it } from 'vitest'

import { makeRateLimiter } from './rate-limiter.ts'

const clock = () => {
  let time = 0
  return { now: () => time, advance: (ms: number) => (time += ms) }
}

describe('makeRateLimiter', () => {
  it('lets a burst through, then refuses with the delay until the next token', () => {
    const time = clock()
    const limiter = makeRateLimiter({ perMinute: 6, burst: 2 }, time.now)

    expect(limiter.take('1.2.3.4')).toEqual({ allowed: true })
    expect(limiter.take('1.2.3.4')).toEqual({ allowed: true })
    expect(limiter.take('1.2.3.4')).toEqual({ allowed: false, retryAfterSeconds: 10 })
  })

  it('refills at its rate', () => {
    const time = clock()
    const limiter = makeRateLimiter({ perMinute: 6, burst: 1 }, time.now)
    limiter.take('1.2.3.4')

    time.advance(9_000)
    expect(limiter.take('1.2.3.4')).toEqual({ allowed: false, retryAfterSeconds: 1 })
    time.advance(1_000)
    expect(limiter.take('1.2.3.4')).toEqual({ allowed: true })
  })

  it('counts each client on its own', () => {
    const limiter = makeRateLimiter({ perMinute: 6, burst: 1 }, clock().now)
    limiter.take('1.2.3.4')

    expect(limiter.take('5.6.7.8')).toEqual({ allowed: true })
  })

  it('forgets idle clients once it tracks too many', () => {
    const time = clock()
    const limiter = makeRateLimiter({ perMinute: 6, burst: 1, maxClients: 2 }, time.now)
    limiter.take('a')
    limiter.take('b')
    time.advance(10_000)
    limiter.take('c')

    expect(limiter.size()).toBeLessThanOrEqual(2)
  })
})

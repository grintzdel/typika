import { describe, expect, it, vi } from 'vitest'
import { withLogging } from '../src/notifications/with-logging.js'
import { withRetry } from '../src/notifications/with-retry.js'
import { withThrottle } from '../src/notifications/with-throttle.js'
import { FakeClock, recordingLogger } from './fakes.js'

const notifierFailing = (times) => {
  let failures = 0
  return vi.fn(() => {
    if (failures < times) {
      failures += 1
      throw new Error('Service unavailable')
    }
  })
}

describe('withRetry', () => {
  it('calls the notifier it wraps again until it succeeds', () => {
    const inner = notifierFailing(1)

    withRetry(inner, 3)('ada@example.com', 'Hello')

    expect(inner).toHaveBeenCalledTimes(2)
  })

  it('rethrows the last error once every attempt failed', () => {
    const inner = notifierFailing(5)

    expect(() => withRetry(inner, 2)('ada@example.com', 'Hello')).toThrow('Service unavailable')
    expect(inner).toHaveBeenCalledTimes(2)
  })
})

describe('withLogging', () => {
  it('logs a notification once the notifier it wraps succeeded', () => {
    const logger = recordingLogger()

    withLogging(notifierFailing(0), logger)('ada@example.com', 'Hello')

    expect(logger.lines).toEqual(['notified ada@example.com'])
  })

  it('logs the failure of the notifier it wraps, and rethrows it', () => {
    const logger = recordingLogger()
    const notify = withLogging(notifierFailing(1), logger)

    expect(() => notify('ada@example.com', 'Hello')).toThrow('Service unavailable')
    expect(logger.lines).toEqual(['failed to notify ada@example.com: Service unavailable'])
  })
})

describe('withThrottle', () => {
  it('skips the notifier it wraps for a recipient notified less than the interval ago', () => {
    const inner = notifierFailing(0)
    const clock = new FakeClock()
    const notify = withThrottle(inner, clock, 1000)

    notify('ada@example.com', 'Hello')
    clock.advance(999)
    notify('ada@example.com', 'Hello again')

    expect(inner).toHaveBeenCalledTimes(1)
  })
})

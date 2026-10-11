import { describe, expect, it, vi } from 'vitest'
import { LoggingNotifier } from '../src/notifications/logging-notifier.ts'
import { RetryingNotifier } from '../src/notifications/retrying-notifier.ts'
import { ThrottledNotifier } from '../src/notifications/throttled-notifier.ts'
import { FakeClock, recordingLogger } from './fakes.ts'

const notifierFailing = (times: number) => {
  let failures = 0
  return {
    notify: vi.fn((_recipient: string, _message: string) => {
      if (failures < times) {
        failures += 1
        throw new Error('Service unavailable')
      }
    }),
  }
}

describe('RetryingNotifier', () => {
  it('calls the notifier it wraps again until it succeeds', () => {
    const inner = notifierFailing(1)

    new RetryingNotifier(inner, 3).notify('ada@example.com', 'Hello')

    expect(inner.notify).toHaveBeenCalledTimes(2)
  })

  it('rethrows the last error once every attempt failed', () => {
    const inner = notifierFailing(5)

    expect(() => new RetryingNotifier(inner, 2).notify('ada@example.com', 'Hello')).toThrow('Service unavailable')
    expect(inner.notify).toHaveBeenCalledTimes(2)
  })
})

describe('LoggingNotifier', () => {
  it('logs a notification once the notifier it wraps succeeded', () => {
    const logger = recordingLogger()

    new LoggingNotifier(notifierFailing(0), logger).notify('ada@example.com', 'Hello')

    expect(logger.lines).toEqual(['notified ada@example.com'])
  })

  it('logs the failure of the notifier it wraps, and rethrows it', () => {
    const logger = recordingLogger()
    const notifier = new LoggingNotifier(notifierFailing(1), logger)

    expect(() => notifier.notify('ada@example.com', 'Hello')).toThrow('Service unavailable')
    expect(logger.lines).toEqual(['failed to notify ada@example.com: Service unavailable'])
  })
})

describe('ThrottledNotifier', () => {
  it('skips the notifier it wraps for a recipient notified less than the interval ago', () => {
    const inner = notifierFailing(0)
    const clock = new FakeClock()
    const notifier = new ThrottledNotifier(inner, clock, 1000)

    notifier.notify('ada@example.com', 'Hello')
    clock.advance(999)
    notifier.notify('ada@example.com', 'Hello again')

    expect(inner.notify).toHaveBeenCalledTimes(1)
  })
})

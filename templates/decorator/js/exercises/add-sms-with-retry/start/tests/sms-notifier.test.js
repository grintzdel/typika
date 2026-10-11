import { describe, expect, it, vi } from 'vitest'
import * as notifiers from '../src/notifications/notifiers.js'
import { recordingLogger } from './fakes.js'

const smsFailing = (times) => {
  let failures = 0
  return {
    sendSms: vi.fn(() => {
      if (failures < times) {
        failures += 1
        throw new Error('SMS gateway busy')
      }
    }),
  }
}

describe('text notifications', () => {
  it('texts the message to the phone number', () => {
    const sms = smsFailing(0)
    const notify = notifiers.createSmsNotifier({ sms, logger: recordingLogger() })

    notify('+33600000001', 'Your order has shipped.')

    expect(sms.sendSms).toHaveBeenCalledWith('+33600000001', 'Your order has shipped.')
  })

  it('retries a failed text, up to three attempts', () => {
    const sms = smsFailing(2)
    const notify = notifiers.createSmsNotifier({ sms, logger: recordingLogger() })

    notify('+33600000001', 'Your order has shipped.')

    expect(sms.sendSms).toHaveBeenCalledTimes(3)
  })

  it('gives up after three failed attempts and logs the failure once', () => {
    const sms = smsFailing(3)
    const logger = recordingLogger()
    const notify = notifiers.createSmsNotifier({ sms, logger })

    expect(() => notify('+33600000001', 'Your order has shipped.')).toThrow('SMS gateway busy')
    expect(sms.sendSms).toHaveBeenCalledTimes(3)
    expect(logger.lines).toEqual(['failed to notify +33600000001: SMS gateway busy'])
  })

  it('logs a sent text once, whatever the number of attempts', () => {
    const logger = recordingLogger()
    const notify = notifiers.createSmsNotifier({ sms: smsFailing(1), logger })

    notify('+33600000001', 'Your order has shipped.')

    expect(logger.lines).toEqual(['notified +33600000001'])
  })

  it('never holds a text back', () => {
    const sms = smsFailing(0)
    const notify = notifiers.createSmsNotifier({ sms, logger: recordingLogger() })

    notify('+33600000001', 'Your order has shipped.')
    notify('+33600000001', 'Your order has been delivered.')

    expect(sms.sendSms).toHaveBeenCalledTimes(2)
  })
})

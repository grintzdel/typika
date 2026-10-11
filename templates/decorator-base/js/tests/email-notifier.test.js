import { describe, expect, it } from 'vitest'
import { createEmailNotifier } from '../src/notifications/notifiers.js'
import { FakeClock, mailerFailing, recordingLogger } from './fakes.js'

const services = (mailer = mailerFailing(0)) => ({ mailer, logger: recordingLogger(), clock: new FakeClock() })

describe('email notifications', () => {
  it('emails the message to the recipient', () => {
    const { mailer, logger, clock } = services()
    const notify = createEmailNotifier({ mailer, logger, clock })

    notify('ada@example.com', 'Your order has shipped.')

    expect(mailer.send).toHaveBeenCalledWith('ada@example.com', 'Your order has shipped.')
  })

  it('retries a failed email, up to three attempts', () => {
    const { mailer, logger, clock } = services(mailerFailing(2))
    const notify = createEmailNotifier({ mailer, logger, clock })

    notify('ada@example.com', 'Your order has shipped.')

    expect(mailer.send).toHaveBeenCalledTimes(3)
  })

  it('gives up after three failed attempts', () => {
    const { mailer, logger, clock } = services(mailerFailing(3))
    const notify = createEmailNotifier({ mailer, logger, clock })

    expect(() => notify('ada@example.com', 'Your order has shipped.')).toThrow('SMTP timeout')
    expect(mailer.send).toHaveBeenCalledTimes(3)
  })

  it('logs a sent email once, whatever the number of attempts', () => {
    const { mailer, logger, clock } = services(mailerFailing(1))
    const notify = createEmailNotifier({ mailer, logger, clock })

    notify('ada@example.com', 'Your order has shipped.')

    expect(logger.lines).toEqual(['notified ada@example.com'])
  })

  it('logs a failed email once, after the last attempt', () => {
    const { mailer, logger, clock } = services(mailerFailing(3))
    const notify = createEmailNotifier({ mailer, logger, clock })

    expect(() => notify('ada@example.com', 'Your order has shipped.')).toThrow()
    expect(logger.lines).toEqual(['failed to notify ada@example.com: SMTP timeout'])
  })

  it('drops a second email to the same recipient within a minute, without logging it', () => {
    const { mailer, logger, clock } = services()
    const notify = createEmailNotifier({ mailer, logger, clock })

    notify('ada@example.com', 'Your order has shipped.')
    clock.advance(59_999)
    notify('ada@example.com', 'Your order has been delivered.')

    expect(mailer.send).toHaveBeenCalledTimes(1)
    expect(logger.lines).toEqual(['notified ada@example.com'])
  })

  it('emails the same recipient again once a minute has passed', () => {
    const { mailer, logger, clock } = services()
    const notify = createEmailNotifier({ mailer, logger, clock })

    notify('ada@example.com', 'Your order has shipped.')
    clock.advance(60_000)
    notify('ada@example.com', 'Your order has been delivered.')

    expect(mailer.send).toHaveBeenCalledTimes(2)
  })

  it('does not hold back other recipients', () => {
    const { mailer, logger, clock } = services()
    const notify = createEmailNotifier({ mailer, logger, clock })

    notify('ada@example.com', 'Your order has shipped.')
    notify('grace@example.com', 'Your order has shipped.')

    expect(mailer.send).toHaveBeenCalledTimes(2)
  })

  it('does not hold back a recipient whose previous email failed', () => {
    const { mailer, logger, clock } = services(mailerFailing(3))
    const notify = createEmailNotifier({ mailer, logger, clock })

    expect(() => notify('ada@example.com', 'Your order has shipped.')).toThrow()
    notify('ada@example.com', 'Your order has shipped.')

    expect(mailer.send).toHaveBeenCalledTimes(4)
  })
})

import type { Clock } from './clock.ts'
import { EmailNotifier } from './email-notifier.ts'
import type { Logger } from './logger.ts'
import { LoggingNotifier } from './logging-notifier.ts'
import type { Mailer } from './mailer.ts'
import type { Notifier } from './notifier.ts'
import { RetryingNotifier } from './retrying-notifier.ts'
import { ThrottledNotifier } from './throttled-notifier.ts'

export type EmailServices = {
  readonly mailer: Mailer
  readonly logger: Logger
  readonly clock: Clock
}

const MAX_ATTEMPTS = 3
const ONE_MINUTE_MS = 60_000

// #region tour:stack
export const createEmailNotifier = ({ mailer, logger, clock }: EmailServices): Notifier => {
  const sending = new EmailNotifier(mailer)
  const retrying = new RetryingNotifier(sending, MAX_ATTEMPTS)
  const logging = new LoggingNotifier(retrying, logger)
  return new ThrottledNotifier(logging, clock, ONE_MINUTE_MS)
}
// #endregion

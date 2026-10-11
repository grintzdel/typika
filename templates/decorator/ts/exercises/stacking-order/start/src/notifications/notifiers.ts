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
  const logging = new LoggingNotifier(sending, logger)
  const retrying = new RetryingNotifier(logging, MAX_ATTEMPTS)
  return new ThrottledNotifier(retrying, clock, ONE_MINUTE_MS)
}
// #endregion

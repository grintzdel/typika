import type { Clock } from './clock.ts'
import { EmailNotifier } from './email-notifier.ts'
import type { Logger } from './logger.ts'
import type { Mailer } from './mailer.ts'
import type { Notifier } from './notifier.ts'

export type EmailServices = {
  readonly mailer: Mailer
  readonly logger: Logger
  readonly clock: Clock
}

const MAX_ATTEMPTS = 3
const ONE_MINUTE_MS = 60_000

export const createEmailNotifier = ({ mailer, logger, clock }: EmailServices): Notifier =>
  new EmailNotifier(mailer, { maxAttempts: MAX_ATTEMPTS, logger, throttle: { clock, intervalMs: ONE_MINUTE_MS } })

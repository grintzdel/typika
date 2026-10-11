import { emailNotifier } from './email-notifier.js'

const MAX_ATTEMPTS = 3
const ONE_MINUTE_MS = 60_000

export const createEmailNotifier = ({ mailer, logger, clock }) =>
  emailNotifier(mailer, { maxAttempts: MAX_ATTEMPTS, logger, throttle: { clock, intervalMs: ONE_MINUTE_MS } })

import { emailNotifier } from './email-notifier.js'
import { smsNotifier } from './sms-notifier.js'
import { withLogging } from './with-logging.js'
import { withRetry } from './with-retry.js'
import { withThrottle } from './with-throttle.js'

const MAX_ATTEMPTS = 3
const ONE_MINUTE_MS = 60_000

// #region tour:stack
export const createEmailNotifier = ({ mailer, logger, clock }) => {
  const sending = emailNotifier(mailer)
  const retrying = withRetry(sending, MAX_ATTEMPTS)
  const logging = withLogging(retrying, logger)
  return withThrottle(logging, clock, ONE_MINUTE_MS)
}
// #endregion

export const createSmsNotifier = ({ sms, logger }) => {
  const sending = smsNotifier(sms)
  const retrying = withRetry(sending, MAX_ATTEMPTS)
  return withLogging(retrying, logger)
}

import { emailNotifier } from './email-notifier.js'
import { withLogging } from './with-logging.js'
import { withRetry } from './with-retry.js'
import { withThrottle } from './with-throttle.js'

const MAX_ATTEMPTS = 3
const ONE_MINUTE_MS = 60_000

// #region tour:stack
export const createEmailNotifier = ({ mailer, logger, clock }) => {
  const sending = emailNotifier(mailer)
  const logging = withLogging(sending, logger)
  const retrying = withRetry(logging, MAX_ATTEMPTS)
  return withThrottle(retrying, clock, ONE_MINUTE_MS)
}
// #endregion

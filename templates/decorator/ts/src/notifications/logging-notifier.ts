import type { Logger } from './logger.ts'
import type { Notifier } from './notifier.ts'

export class LoggingNotifier implements Notifier {
  private readonly inner: Notifier
  private readonly logger: Logger

  constructor(inner: Notifier, logger: Logger) {
    this.inner = inner
    this.logger = logger
  }

  // #region tour:around
  notify(recipient: string, message: string): void {
    try {
      this.inner.notify(recipient, message)
    } catch (error) {
      this.logger.info(`failed to notify ${recipient}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
    this.logger.info(`notified ${recipient}`)
  }
  // #endregion
}

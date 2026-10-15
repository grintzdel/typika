package notifications

class LoggingNotifier(private val inner: Notifier, private val logger: Logger) : Notifier by inner {
    // #region tour:around
    override fun notify(recipient: String, message: String) {
        try {
            inner.notify(recipient, message)
        } catch (error: Exception) {
            logger.info("failed to notify $recipient: ${error.message}")
            throw error
        }
        logger.info("notified $recipient")
    }
    // #endregion
}

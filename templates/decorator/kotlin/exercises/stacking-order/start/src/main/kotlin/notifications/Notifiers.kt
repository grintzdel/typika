package notifications

class EmailServices(val mailer: Mailer, val logger: Logger, val clock: Clock)

private const val MAX_ATTEMPTS = 3
private const val ONE_MINUTE_MS = 60_000L

// #region tour:stack
fun createEmailNotifier(services: EmailServices): Notifier {
    val sending = EmailNotifier(services.mailer)
    val logging = LoggingNotifier(sending, services.logger)
    val retrying = RetryingNotifier(logging, MAX_ATTEMPTS)
    return ThrottledNotifier(retrying, services.clock, ONE_MINUTE_MS)
}
// #endregion

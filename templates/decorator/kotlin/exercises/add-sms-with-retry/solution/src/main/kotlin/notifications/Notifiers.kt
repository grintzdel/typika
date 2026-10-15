package notifications

class EmailServices(val mailer: Mailer, val logger: Logger, val clock: Clock)

class SmsServices(val sms: SmsGateway, val logger: Logger)

private const val MAX_ATTEMPTS = 3
private const val ONE_MINUTE_MS = 60_000L

// #region tour:stack
fun createEmailNotifier(services: EmailServices): Notifier {
    val sending = EmailNotifier(services.mailer)
    val retrying = RetryingNotifier(sending, MAX_ATTEMPTS)
    val logging = LoggingNotifier(retrying, services.logger)
    return ThrottledNotifier(logging, services.clock, ONE_MINUTE_MS)
}
// #endregion

fun createSmsNotifier(services: SmsServices): Notifier {
    val sending = SmsNotifier(services.sms)
    val retrying = RetryingNotifier(sending, MAX_ATTEMPTS)
    return LoggingNotifier(retrying, services.logger)
}

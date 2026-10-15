package notifications

class EmailServices(val mailer: Mailer, val logger: Logger, val clock: Clock)

private const val MAX_ATTEMPTS = 3
private const val ONE_MINUTE_MS = 60_000L

fun createEmailNotifier(services: EmailServices): Notifier = EmailNotifier(
    services.mailer,
    maxAttempts = MAX_ATTEMPTS,
    logger = services.logger,
    throttle = Throttle(services.clock, ONE_MINUTE_MS),
)

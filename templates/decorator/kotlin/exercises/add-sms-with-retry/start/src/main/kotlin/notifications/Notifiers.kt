package notifications

class EmailServices(val mailer: Mailer, val logger: Logger, val clock: Clock)

class SmsServices(val sms: SmsGateway, val logger: Logger)

private const val MAX_ATTEMPTS = 3
private const val ONE_MINUTE_MS = 60_000L

fun createEmailNotifier(services: EmailServices): Notifier = EmailNotifier(
    services.mailer,
    maxAttempts = MAX_ATTEMPTS,
    logger = services.logger,
    throttle = Throttle(services.clock, ONE_MINUTE_MS),
)

fun createSmsNotifier(services: SmsServices): Notifier = TODO("Text the message, with retry and logging")

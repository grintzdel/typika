package notifications

class Throttle(val clock: Clock, val intervalMs: Long)

class EmailNotifier(
    private val mailer: Mailer,
    private val maxAttempts: Int = 1,
    private val logger: Logger? = null,
    private val throttle: Throttle? = null,
) : Notifier {
    private val lastSentAt = mutableMapOf<String, Long>()

    override fun notify(recipient: String, message: String) {
        if (throttle != null) {
            val last = lastSentAt[recipient]
            if (last != null && throttle.clock.now() - last < throttle.intervalMs) return
        }

        var attempt = 1
        while (true) {
            try {
                mailer.send(recipient, message)
                break
            } catch (error: Exception) {
                if (attempt >= maxAttempts) {
                    logger?.info("failed to notify $recipient: ${error.message}")
                    throw error
                }
                attempt += 1
            }
        }

        logger?.info("notified $recipient")
        if (throttle != null) lastSentAt[recipient] = throttle.clock.now()
    }
}

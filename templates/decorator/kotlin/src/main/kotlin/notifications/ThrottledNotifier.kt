package notifications

class ThrottledNotifier(
    private val inner: Notifier,
    private val clock: Clock,
    private val intervalMs: Long,
) : Notifier by inner {
    private val lastSentAt = mutableMapOf<String, Long>()

    override fun notify(recipient: String, message: String) {
        val last = lastSentAt[recipient]
        if (last != null && clock.now() - last < intervalMs) return

        inner.notify(recipient, message)
        lastSentAt[recipient] = clock.now()
    }
}

package notifications

// #region tour:decorator
class RetryingNotifier(private val inner: Notifier, private val maxAttempts: Int) : Notifier by inner {
    override fun notify(recipient: String, message: String) {
        var attempt = 1
        while (true) {
            try {
                return inner.notify(recipient, message)
            } catch (error: Exception) {
                if (attempt >= maxAttempts) throw error
                attempt += 1
            }
        }
    }
}
// #endregion

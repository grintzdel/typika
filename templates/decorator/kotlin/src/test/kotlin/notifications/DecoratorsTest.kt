package notifications

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class FailingNotifier(private val failures: Int) : Notifier {
    var calls = 0

    override fun notify(recipient: String, message: String) {
        calls += 1
        if (calls <= failures) throw IllegalStateException("Service unavailable")
    }
}

class DecoratorsTest {
    @Test
    fun `RetryingNotifier calls the notifier it wraps again until it succeeds`() {
        val inner = FailingNotifier(1)

        RetryingNotifier(inner, 3).notify("ada@example.com", "Hello")

        assertEquals(2, inner.calls)
    }

    @Test
    fun `RetryingNotifier rethrows the last error once every attempt failed`() {
        val inner = FailingNotifier(5)

        val error = assertFailsWith<IllegalStateException> { RetryingNotifier(inner, 2).notify("ada@example.com", "Hello") }

        assertEquals("Service unavailable", error.message)
        assertEquals(2, inner.calls)
    }

    @Test
    fun `LoggingNotifier logs a notification once the notifier it wraps succeeded`() {
        val logger = RecordingLogger()

        LoggingNotifier(FailingNotifier(0), logger).notify("ada@example.com", "Hello")

        assertEquals(listOf("notified ada@example.com"), logger.lines)
    }

    @Test
    fun `LoggingNotifier logs the failure of the notifier it wraps, and rethrows it`() {
        val logger = RecordingLogger()
        val notifier = LoggingNotifier(FailingNotifier(1), logger)

        assertFailsWith<IllegalStateException> { notifier.notify("ada@example.com", "Hello") }

        assertEquals(listOf("failed to notify ada@example.com: Service unavailable"), logger.lines)
    }

    @Test
    fun `ThrottledNotifier skips the notifier it wraps for a recipient notified less than the interval ago`() {
        val inner = FailingNotifier(0)
        val clock = FakeClock()
        val notifier = ThrottledNotifier(inner, clock, 1000)

        notifier.notify("ada@example.com", "Hello")
        clock.advance(999)
        notifier.notify("ada@example.com", "Hello again")

        assertEquals(1, inner.calls)
    }
}

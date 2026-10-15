package notifications

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class EmailNotifierTest {
    private val logger = RecordingLogger()
    private val clock = FakeClock()

    private fun notifierWith(mailer: Mailer) = createEmailNotifier(EmailServices(mailer, logger, clock))

    @Test
    fun `emails the message to the recipient`() {
        val mailer = FailingMailer(0)

        notifierWith(mailer).notify("ada@example.com", "Your order has shipped.")

        assertEquals(listOf(Sent("ada@example.com", "Your order has shipped.")), mailer.attempts)
    }

    @Test
    fun `retries a failed email, up to three attempts`() {
        val mailer = FailingMailer(2)

        notifierWith(mailer).notify("ada@example.com", "Your order has shipped.")

        assertEquals(3, mailer.attempts.size)
    }

    @Test
    fun `gives up after three failed attempts`() {
        val mailer = FailingMailer(3)
        val notifier = notifierWith(mailer)

        val error = assertFailsWith<IllegalStateException> { notifier.notify("ada@example.com", "Your order has shipped.") }

        assertEquals("SMTP timeout", error.message)
        assertEquals(3, mailer.attempts.size)
    }

    @Test
    fun `logs a sent email once, whatever the number of attempts`() {
        notifierWith(FailingMailer(1)).notify("ada@example.com", "Your order has shipped.")

        assertEquals(listOf("notified ada@example.com"), logger.lines)
    }

    @Test
    fun `logs a failed email once, after the last attempt`() {
        val notifier = notifierWith(FailingMailer(3))

        assertFailsWith<IllegalStateException> { notifier.notify("ada@example.com", "Your order has shipped.") }

        assertEquals(listOf("failed to notify ada@example.com: SMTP timeout"), logger.lines)
    }

    @Test
    fun `drops a second email to the same recipient within a minute, without logging it`() {
        val mailer = FailingMailer(0)
        val notifier = notifierWith(mailer)

        notifier.notify("ada@example.com", "Your order has shipped.")
        clock.advance(59_999)
        notifier.notify("ada@example.com", "Your order has been delivered.")

        assertEquals(1, mailer.attempts.size)
        assertEquals(listOf("notified ada@example.com"), logger.lines)
    }

    @Test
    fun `emails the same recipient again once a minute has passed`() {
        val mailer = FailingMailer(0)
        val notifier = notifierWith(mailer)

        notifier.notify("ada@example.com", "Your order has shipped.")
        clock.advance(60_000)
        notifier.notify("ada@example.com", "Your order has been delivered.")

        assertEquals(2, mailer.attempts.size)
    }

    @Test
    fun `does not hold back other recipients`() {
        val mailer = FailingMailer(0)
        val notifier = notifierWith(mailer)

        notifier.notify("ada@example.com", "Your order has shipped.")
        notifier.notify("grace@example.com", "Your order has shipped.")

        assertEquals(2, mailer.attempts.size)
    }

    @Test
    fun `does not hold back a recipient whose previous email failed`() {
        val mailer = FailingMailer(3)
        val notifier = notifierWith(mailer)

        assertFailsWith<IllegalStateException> { notifier.notify("ada@example.com", "Your order has shipped.") }
        notifier.notify("ada@example.com", "Your order has shipped.")

        assertEquals(4, mailer.attempts.size)
    }
}

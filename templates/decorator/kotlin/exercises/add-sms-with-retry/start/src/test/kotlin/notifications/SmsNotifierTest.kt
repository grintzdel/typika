package notifications

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

data class Text(val phoneNumber: String, val text: String)

class FailingSms(private val failures: Int) : SmsGateway {
    val attempts = mutableListOf<Text>()

    override fun sendSms(phoneNumber: String, text: String) {
        attempts += Text(phoneNumber, text)
        if (attempts.size <= failures) throw IllegalStateException("SMS gateway busy")
    }
}

class SmsNotifierTest {
    @Test
    fun `texts the message to the phone number`() {
        val sms = FailingSms(0)

        createSmsNotifier(SmsServices(sms, RecordingLogger())).notify("+33600000001", "Your order has shipped.")

        assertEquals(listOf(Text("+33600000001", "Your order has shipped.")), sms.attempts)
    }

    @Test
    fun `retries a failed text, up to three attempts`() {
        val sms = FailingSms(2)

        createSmsNotifier(SmsServices(sms, RecordingLogger())).notify("+33600000001", "Your order has shipped.")

        assertEquals(3, sms.attempts.size)
    }

    @Test
    fun `gives up after three failed attempts and logs the failure once`() {
        val sms = FailingSms(3)
        val logger = RecordingLogger()
        val notifier = createSmsNotifier(SmsServices(sms, logger))

        val error = assertFailsWith<IllegalStateException> { notifier.notify("+33600000001", "Your order has shipped.") }

        assertEquals("SMS gateway busy", error.message)
        assertEquals(3, sms.attempts.size)
        assertEquals(listOf("failed to notify +33600000001: SMS gateway busy"), logger.lines)
    }

    @Test
    fun `logs a sent text once, whatever the number of attempts`() {
        val logger = RecordingLogger()

        createSmsNotifier(SmsServices(FailingSms(1), logger)).notify("+33600000001", "Your order has shipped.")

        assertEquals(listOf("notified +33600000001"), logger.lines)
    }

    @Test
    fun `never holds a text back`() {
        val sms = FailingSms(0)
        val notifier = createSmsNotifier(SmsServices(sms, RecordingLogger()))

        notifier.notify("+33600000001", "Your order has shipped.")
        notifier.notify("+33600000001", "Your order has been delivered.")

        assertEquals(2, sms.attempts.size)
    }
}

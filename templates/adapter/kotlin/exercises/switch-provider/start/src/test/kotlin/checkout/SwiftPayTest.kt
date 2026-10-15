package checkout

import shop.Card
import shop.eur
import vendor.swiftpay.SwiftPayAmount
import vendor.swiftpay.SwiftPayCharge
import vendor.swiftpay.SwiftPayClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class SwiftPayTest {
    private fun payWith(source: String) = openCheckoutWithSwiftPay(SwiftPayClient()).checkout.pay(order, Card(source))

    @Test
    fun `charges the order total as a decimal amount in euros`() {
        val client = SwiftPayClient()

        openCheckoutWithSwiftPay(client).checkout.pay(order, Card("src_visa"))

        assertEquals(SwiftPayCharge(SwiftPayAmount("32.50", "EUR"), "src_visa"), client.findCharge("sp_ch_1"))
    }

    @Test
    fun `pays with an accepted card`() {
        assertEquals(PaymentOutcome.Paid("sp_ch_1", eur(3250)), payWith("src_visa"))
    }

    @Test
    fun `declines a card without enough funds`() {
        assertEquals(PaymentOutcome.Declined("Your card was declined: insufficient funds."), payWith("src_no_funds"))
    }

    @Test
    fun `declines an expired card`() {
        assertEquals(PaymentOutcome.Declined("Your card has expired."), payWith("src_expired"))
    }

    @Test
    fun `declines a card the bank refuses`() {
        assertEquals(PaymentOutcome.Declined("Your card was declined."), payWith("src_declined"))
    }

    @Test
    fun `asks to try again later when SwiftPay is busy`() {
        assertEquals(PaymentOutcome.RetryLater, payWith("src_busy"))
    }

    @Test
    fun `refunds a paid order`() {
        val (checkout, cancellation) = openCheckoutWithSwiftPay(SwiftPayClient())
        val payment = assertIs<PaymentOutcome.Paid>(checkout.pay(order, Card("src_visa")))

        assertEquals(CancellationOutcome.REFUNDED, cancellation.cancel(payment.paymentId, payment.amount))
    }

    @Test
    fun `reports a refund for an unknown payment as failed`() {
        val (_, cancellation) = openCheckoutWithSwiftPay(SwiftPayClient())

        assertEquals(CancellationOutcome.REFUND_FAILED, cancellation.cancel("sp_ch_404", eur(3250)))
    }
}

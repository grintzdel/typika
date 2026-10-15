package checkout

import shop.Card
import shop.eur
import vendor.legacypay.LegacyPayClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class CancellationTest {
    @Test
    fun `refunds a paid order`() {
        val (checkout, cancellation) = openCheckout(LegacyPayClient())
        val payment = assertIs<PaymentOutcome.Paid>(checkout.pay(order, Card("tok_visa")))

        assertEquals(CancellationOutcome.REFUNDED, cancellation.cancel(payment.paymentId, payment.amount))
    }

    @Test
    fun `reports a refund for an unknown payment as failed`() {
        val (_, cancellation) = openCheckout(LegacyPayClient())

        assertEquals(CancellationOutcome.REFUND_FAILED, cancellation.cancel("LP-404", eur(3250)))
    }

    @Test
    fun `reports a refund larger than the payment as failed`() {
        val (checkout, cancellation) = openCheckout(LegacyPayClient())
        val payment = assertIs<PaymentOutcome.Paid>(checkout.pay(order, Card("tok_visa")))

        assertEquals(CancellationOutcome.REFUND_FAILED, cancellation.cancel(payment.paymentId, eur(9999)))
    }
}

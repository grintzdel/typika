package app

import payments.Payment
import payments.PaymentMethod
import shop.eur
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFails
import kotlin.test.assertNotNull

class GiftCardPaymentTest {
    private val giftCard
        get() = assertNotNull(
            PaymentMethod.entries.find { it.label == "gift-card" },
            "no payment method is labelled gift-card",
        )

    @Test
    fun `pays through the gift card partner`() {
        val services = FakeServices()

        val payment = services.open().checkout.pay(giftCard, eur(2500))

        assertEquals(listOf(eur(2500)), services.giftCards.redeemed)
        assertEquals(Payment("gift-1", giftCard, eur(2500)), payment)
    }

    @Test
    fun `records the payment in the ledger`() {
        val services = FakeServices()

        services.open().checkout.pay(giftCard, eur(2500))

        assertEquals(listOf("gift card: redeemed 25.00 EUR"), services.ledger.entries)
    }

    @Test
    fun `lets the partner refuse a payment`() {
        val services = FakeServices()
        services.giftCards.refusal = IllegalStateException("Gift card balance too low")
        val method = giftCard

        val error = assertFails { services.open().checkout.pay(method, eur(2500)) }

        assertEquals("Gift card balance too low", error.message)
        assertEquals(emptyList(), services.ledger.entries)
    }

    @Test
    fun `refuses to refund a gift card payment`() {
        val shop = FakeServices().open()
        val payment = shop.checkout.pay(giftCard, eur(2500))

        val error = assertFails { shop.refunds.refund(payment) }

        assertEquals("Payments by gift-card cannot be refunded", error.message)
    }

    @Test
    fun `keeps refunding card payments`() {
        val services = FakeServices()
        val shop = services.open()

        shop.refunds.refund(shop.checkout.pay(PaymentMethod.CARD, eur(5990)))

        assertContains(services.ledger.entries, "card: refunded 59.90 EUR of card-1")
    }
}

package app

import payments.Payment
import payments.PaymentMethod
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class PaymentsTest {
    @Test
    fun `charges a card`() {
        val services = FakeServices()

        val payment = services.open().checkout.pay(PaymentMethod.CARD, eur(5990))

        assertEquals(Payment("card-1", PaymentMethod.CARD, eur(5990)), payment)
        assertEquals(listOf("card: charged 59.90 EUR"), services.ledger.entries)
    }

    @Test
    fun `requests a bank transfer`() {
        val services = FakeServices()

        val payment = services.open().checkout.pay(PaymentMethod.BANK_TRANSFER, eur(3250))

        assertEquals(Payment("transfer-1", PaymentMethod.BANK_TRANSFER, eur(3250)), payment)
        assertEquals(listOf("bank transfer: requested 32.50 EUR"), services.ledger.entries)
    }

    @Test
    fun `refunds a payment through the method that took it`() {
        val services = FakeServices()
        val shop = services.open()

        shop.refunds.refund(shop.checkout.pay(PaymentMethod.CARD, eur(5990)))
        shop.refunds.refund(shop.checkout.pay(PaymentMethod.BANK_TRANSFER, eur(3250)))

        val expected = listOf(
            "card: charged 59.90 EUR",
            "card: refunded 59.90 EUR of card-1",
            "bank transfer: requested 32.50 EUR",
            "bank transfer: sent back 32.50 EUR of transfer-1",
        )
        assertEquals(expected, services.ledger.entries)
    }

    @Test
    fun `saves a card and keeps only its last four digits in the token`() {
        val services = FakeServices()

        val token = services.open().wallet.saveCard("grace@example.com", "4242424242424242")

        assertEquals("tok-4242", token)
        assertEquals(listOf("card: saved tok-4242 for grace@example.com"), services.ledger.entries)
    }

    @Test
    fun `subscribes a saved card to the tea club at 9,90 EUR a month`() {
        val services = FakeServices()

        services.open().teaClub.join("tok-4242")

        assertEquals(listOf("card: subscribed tok-4242 to 9.90 EUR a month"), services.ledger.entries)
    }
}

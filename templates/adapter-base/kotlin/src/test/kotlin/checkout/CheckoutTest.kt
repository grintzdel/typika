package checkout

import shop.Card
import shop.eur
import vendor.legacypay.LegacyPayClient
import vendor.legacypay.LegacyPayment
import kotlin.test.Test
import kotlin.test.assertEquals

class CheckoutTest {
    private fun payWith(token: String) = openCheckout(LegacyPayClient()).checkout.pay(order, Card(token))

    @Test
    fun `charges the order total in euros`() {
        val client = LegacyPayClient()

        openCheckout(client).checkout.pay(order, Card("tok_visa"))

        assertEquals(LegacyPayment(3250, 978, "tok_visa"), client.findPayment("LP-1"))
    }

    @Test
    fun `pays with an accepted card`() {
        assertEquals(PaymentOutcome.Paid("LP-1", eur(3250)), payWith("tok_visa"))
    }

    @Test
    fun `declines a card without enough funds`() {
        assertEquals(PaymentOutcome.Declined("Your card was declined: insufficient funds."), payWith("tok_no_funds"))
    }

    @Test
    fun `declines an expired card`() {
        assertEquals(PaymentOutcome.Declined("Your card has expired."), payWith("tok_expired"))
    }

    @Test
    fun `declines a card the issuer refuses`() {
        assertEquals(PaymentOutcome.Declined("Your card was declined."), payWith("tok_refused"))
    }

    @Test
    fun `asks to try again later when the card issuer is unavailable`() {
        assertEquals(PaymentOutcome.RetryLater, payWith("tok_issuer_down"))
    }
}

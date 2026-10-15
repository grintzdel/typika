package payments

import shop.Card
import shop.eur
import vendor.legacypay.LegacyPayClient
import vendor.legacypay.LegacyPayment
import kotlin.test.Test
import kotlin.test.assertEquals

class LegacyPayAdapterTest {
    @Test
    fun `sends the amount in cents and the currency as its ISO numeric code`() {
        val client = LegacyPayClient()

        LegacyPayAdapter(client).charge(eur(1999), Card("tok_visa"))

        assertEquals(LegacyPayment(1999, 978, "tok_visa"), client.findPayment("LP-1"))
    }

    @Test
    fun `turns an approval into an approved charge with the payment reference`() {
        assertEquals(
            ChargeResult.Approved("LP-1"),
            LegacyPayAdapter(LegacyPayClient()).charge(eur(1999), Card("tok_visa")),
        )
    }

    @Test
    fun `declines a charge on a code it does not know`() {
        assertEquals(
            ChargeResult.Declined(DeclineReason.REFUSED),
            LegacyPayAdapter(LegacyPayClient()).charge(eur(1999), Card("tok_fraud")),
        )
    }

    @Test
    fun `turns an approved reversal into a refund`() {
        val adapter = LegacyPayAdapter(LegacyPayClient())
        adapter.charge(eur(1999), Card("tok_visa"))

        assertEquals(RefundResult.REFUNDED, adapter.refund("LP-1", eur(1999)))
    }
}

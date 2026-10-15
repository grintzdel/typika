package payments.clients

import payments.Chargeable
import payments.Payment
import payments.PaymentMethod
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class CheckoutTest {
    @Test
    fun `pays through any method that can charge, and nothing more`() {
        val charged = mutableListOf<Long>()
        val onlyCharges = Chargeable { amount ->
            charged += amount.cents
            Payment("fake-1", PaymentMethod.CARD, amount)
        }

        Checkout(mapOf(PaymentMethod.CARD to onlyCharges)).pay(PaymentMethod.CARD, eur(1500))

        assertEquals(listOf(1500L), charged)
    }
}

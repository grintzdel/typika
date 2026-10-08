package checkout

import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class QuoteTest {
    private val order = Order(
        Customer("Ada", Tier.REGULAR),
        listOf(
            OrderLine("MUG-01", eur(1200), quantity = 2, unitWeightGrams = 400),
            OrderLine("TEA-GREEN", eur(850), quantity = 1, unitWeightGrams = 250),
        ),
    )

    @Test
    fun `sums every line into the subtotal`() {
        assertEquals(eur(3250), quoteShipping(order, ShippingOption.STANDARD).subtotal)
    }

    @Test
    fun `adds the shipping cost to the subtotal`() {
        assertEquals(eur(3740), quoteShipping(order, ShippingOption.STANDARD).total)
    }
}

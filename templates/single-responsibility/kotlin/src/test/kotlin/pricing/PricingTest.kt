package pricing

import orders.ada
import orders.grace
import orders.orderOf
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class PricingTest {
    @Test
    fun `prices a regular order with shipping and no discount`() {
        val priced = priceOrder(orderOf(ada, 3250))

        assertEquals(Triple(eur(0), eur(490), eur(3740)), Triple(priced.discount, priced.shipping, priced.total))
    }

    @Test
    fun `prices a member order with its discount and free shipping`() {
        val priced = priceOrder(orderOf(grace, 5990))

        assertEquals(Triple(eur(599), eur(0), eur(5391)), Triple(priced.discount, priced.shipping, priced.total))
    }
}

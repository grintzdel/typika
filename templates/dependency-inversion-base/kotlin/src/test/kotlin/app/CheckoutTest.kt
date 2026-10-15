package app

import shop.ada
import shop.grace
import shop.orderOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class CheckoutTest {
    @Test
    fun `gives every order its own id`() {
        val checkout = openShop().checkout

        assertEquals("order-1", checkout.placeOrder(orderOf(ada, 1000)))
        assertEquals("order-2", checkout.placeOrder(orderOf(grace, 2000)))
    }

    @Test
    fun `finds a placed order by its id`() {
        val checkout = openShop().checkout
        val order = orderOf(grace, 5990)

        val orderId = checkout.placeOrder(order)

        assertEquals(order, checkout.findOrder(orderId))
    }

    @Test
    fun `finds nothing for an unknown id`() {
        assertNull(openShop().checkout.findOrder("order-9"))
    }
}

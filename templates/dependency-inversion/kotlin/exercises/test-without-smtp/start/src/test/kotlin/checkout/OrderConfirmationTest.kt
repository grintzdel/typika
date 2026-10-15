package checkout

import shop.grace
import shop.orderOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class OrderConfirmationTest {
    @Test
    fun `confirms the order to the customer with its total`() {
        val notifier = FakeNotifier()

        CheckoutService(FakeOrders(), notifier).placeOrder(orderOf(grace, 5990))

        assertEquals(listOf("grace@example.com: Order order-1 confirmed: 59.90 EUR"), notifier.sent)
    }

    @Test
    fun `saves the order in the store it is given`() {
        val orders = FakeOrders()
        val order = orderOf(grace, 5990)

        CheckoutService(orders, FakeNotifier()).placeOrder(order)

        assertEquals(order, orders.find("order-1"))
    }

    @Test
    fun `does not confirm an order that could not be saved`() {
        val notifier = FakeNotifier()
        val unavailable = FakeOrders().apply { failure = IllegalStateException("Database unavailable") }

        val error = assertFails { CheckoutService(unavailable, notifier).placeOrder(orderOf(grace, 5990)) }

        assertEquals("Database unavailable", error.message)
        assertEquals(emptyList(), notifier.sent)
    }
}

package orders

import shop.OrderLine
import shop.Order
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class OrderServiceTest {
    @Test
    fun `gives every order its own id`() {
        val orderService = FakeServices().orderService()

        assertEquals("order-1", orderService.placeOrder(orderOf(ada, 1000)).orderId)
        assertEquals("order-2", orderService.placeOrder(orderOf(grace, 2000)).orderId)
    }

    @Test
    fun `emails the customer an itemised invoice`() {
        val services = FakeServices()

        services.orderService().placeOrder(
            Order(ada, listOf(OrderLine("MUG-01", eur(1200), 2), OrderLine("TEA-GREEN", eur(850), 1))),
        )

        val invoice = listOf(
            "Invoice order-1",
            "2 x MUG-01: 24.00 EUR",
            "1 x TEA-GREEN: 8.50 EUR",
            "Shipping: 4.90 EUR",
            "Total: 37.40 EUR",
        )
        assertEquals(listOf(Email("ada@example.com", invoice.joinToString("\n"))), services.notifier.sent)
    }

    @Test
    fun `takes 10% off for members and ships free from 50,00 EUR`() {
        val services = FakeServices()

        val placed = services.orderService().placeOrder(orderOf(grace, 5990))

        assertEquals(eur(5391), placed.total)
        val invoice = listOf(
            "Invoice order-1",
            "1 x TEST-SKU: 59.90 EUR",
            "Member discount: -5.99 EUR",
            "Shipping: 0.00 EUR",
            "Total: 53.91 EUR",
        )
        assertEquals(listOf(Email("grace@example.com", invoice.joinToString("\n"))), services.notifier.sent)
    }

    @Test
    fun `charges shipping when the discount brings the order under 50,00 EUR`() {
        val placed = FakeServices().orderService().placeOrder(orderOf(grace, 5200))

        assertEquals(eur(4680 + 490), placed.total)
    }

    @Test
    fun `refuses an order without lines`() {
        val orderService = FakeServices().orderService()

        assertFailsWith<InvalidOrderException> { orderService.placeOrder(Order(ada, emptyList())) }
    }

    @Test
    fun `refuses a quantity below one`() {
        val orderService = FakeServices().orderService()
        val order = Order(ada, listOf(OrderLine("MUG-01", eur(1200), 0)))

        val error = assertFailsWith<InvalidOrderException> { orderService.placeOrder(order) }
        assertEquals("Invalid quantity for MUG-01: 0", error.message)
    }

    @Test
    fun `neither saves nor emails an invalid order`() {
        val services = FakeServices()
        val orderService = services.orderService()

        assertFailsWith<InvalidOrderException> { orderService.placeOrder(orderOf(ada.copy(email = "ada"), 1000)) }

        assertEquals(emptyList(), services.notifier.sent)
        assertEquals("order-1", orderService.placeOrder(orderOf(ada, 1000)).orderId)
    }
}

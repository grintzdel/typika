package orders

import infrastructure.InMemoryDatabase
import orders.adapters.InMemoryOrderRepository
import orders.domain.Customer
import orders.domain.OrderConflictException
import orders.domain.OrderLineRequest
import orders.domain.OrderRequest
import shop.Money
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.time.Instant

private val approvingPayments = object : PaymentGateway {
    override fun charge(amount: Money, cardToken: String) = ChargeResult.Approved("pay-1")

    override fun refund(paymentId: String) {}
}

private fun serviceNotifying(notifications: MutableList<OrderNotification>) =
    OrderService(
        orders = InMemoryOrderRepository(InMemoryDatabase()),
        payments = approvingPayments,
        notifier = Notifier { notifications += it },
        events = OrderEventPublisher {},
        clock = Clock { Instant.parse("2026-10-01T09:00:00Z") },
    )

private fun orderOf(totalCents: Int) =
    OrderRequest(Customer("Ada", "ada@example.com"), listOf(OrderLineRequest("TEST-SKU", totalCents, 1)))

class OrderServiceTest {
    @Test
    fun `places an order without any HTTP request`() {
        val notifications = mutableListOf<OrderNotification>()

        val order = serviceNotifying(notifications).placeOrder(orderOf(3250))

        assertEquals(Money(3250), order.total)
        assertEquals(listOf<OrderNotification>(OrderNotification.Confirmed(order)), notifications)
    }

    @Test
    fun `refuses to ship an unpaid order with a domain error`() {
        val service = serviceNotifying(mutableListOf())
        val order = service.placeOrder(orderOf(3250))

        assertFailsWith<OrderConflictException> { service.shipOrder(order.id) }
    }
}

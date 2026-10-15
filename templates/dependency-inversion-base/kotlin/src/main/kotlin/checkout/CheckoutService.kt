package checkout

import infrastructure.InMemoryOrderStore
import infrastructure.OrderId
import infrastructure.SmtpMailer
import shop.Order

class CheckoutService {
    private val orders = InMemoryOrderStore()
    private val notifier = SmtpMailer("smtp.shop.example", 587)

    fun placeOrder(order: Order): OrderId {
        val orderId = orders.add(order)
        notifier.notify(order.customer.email, "Order $orderId confirmed: ${order.total}")
        return orderId
    }

    fun findOrder(orderId: OrderId): Order? = orders.find(orderId)
}

package orders

import services.Notifier
import shop.Money
import shop.Order
import shop.Tier
import shop.eur

data class PlacedOrder(val orderId: OrderId, val total: Money)

private const val MEMBER_DISCOUNT_PERCENT = 10
private val FREE_SHIPPING_FROM = eur(5000)
private val SHIPPING_FEE = eur(490)

class OrderService(private val orders: OrderRepository, private val notifier: Notifier) {
    fun placeOrder(order: Order): PlacedOrder {
        if (order.lines.isEmpty()) throw InvalidOrderException("An order needs at least one line")
        for (line in order.lines) {
            if (line.quantity < 1) throw InvalidOrderException("Invalid quantity for ${line.sku}: ${line.quantity}")
        }
        if ('@' !in order.customer.email) {
            throw InvalidOrderException("Invalid email address: ${order.customer.email}")
        }

        val invoice = mutableListOf<String>()
        var subtotal = Money.ZERO
        for (line in order.lines) {
            val amount = line.unitPrice * line.quantity
            subtotal += amount
            invoice += "${line.quantity} x ${line.sku}: $amount"
        }

        var total = subtotal
        if (order.customer.tier == Tier.MEMBER) {
            val discount = subtotal.percent(MEMBER_DISCOUNT_PERCENT)
            total -= discount
            invoice += "Member discount: -$discount"
        }

        val shipping = if (total.isAtLeast(FREE_SHIPPING_FROM)) Money.ZERO else SHIPPING_FEE
        total += shipping
        invoice += "Shipping: $shipping"
        invoice += "Total: $total"

        val orderId = orders.add(order)
        notifier.notify(order.customer.email, (listOf("Invoice $orderId") + invoice).joinToString("\n"))

        return PlacedOrder(orderId, total)
    }
}

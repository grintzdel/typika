package orders

import shop.Order

fun validateOrder(order: Order) {
    if (order.lines.isEmpty()) throw InvalidOrderException("An order needs at least one line")
    for (line in order.lines) {
        if (line.quantity < 1) throw InvalidOrderException("Invalid quantity for ${line.sku}: ${line.quantity}")
    }
    if ('@' !in order.customer.email) {
        throw InvalidOrderException("Invalid email address: ${order.customer.email}")
    }
}

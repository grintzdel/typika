package orders.write

import infrastructure.CardProcessor
import infrastructure.Charge
import infrastructure.Email
import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase
import infrastructure.ManualClock
import infrastructure.OrderRow
import infrastructure.SmtpMailer
import orders.OrderCancelled
import orders.OrderDelivered
import orders.OrderEvent
import orders.OrderPaid
import orders.OrderPlaced
import orders.OrderShipped
import orders.Projection
import shop.eur

private fun invalid(reason: String) = CommandResult.Rejected(Rejection.INVALID, reason)

private fun conflict(reason: String) = CommandResult.Rejected(Rejection.CONFLICT, reason)

private fun brokerMessageOf(event: OrderEvent): Pair<String, Map<String, Any?>> =
    when (event) {
        is OrderPlaced ->
            "OrderPlaced" to
                mapOf(
                    "orderId" to event.orderId,
                    "customerEmail" to event.customerEmail,
                    "totalCents" to event.totalCents,
                )
        is OrderPaid -> "OrderPaid" to mapOf("orderId" to event.orderId, "totalCents" to event.totalCents)
        is OrderShipped -> "OrderShipped" to mapOf("orderId" to event.orderId)
        is OrderDelivered -> "OrderDelivered" to mapOf("orderId" to event.orderId)
        is OrderCancelled -> "OrderCancelled" to mapOf("orderId" to event.orderId)
    }

class OrderCommandHandler(
    private val db: InMemoryDatabase,
    private val cards: CardProcessor,
    private val broker: FakeBroker,
    private val mailer: SmtpMailer,
    private val clock: ManualClock,
    private val projections: List<Projection>,
) {
    fun execute(command: OrderCommand): CommandResult =
        when (command) {
            is PlaceOrder -> placeOrder(command)
            is OrderChange -> {
                val order = db.orders[command.orderId]
                    ?: return CommandResult.Rejected(Rejection.NOT_FOUND, "Order ${command.orderId} not found")
                when (command) {
                    is PayOrder -> payOrder(order, command.cardToken)
                    is ShipOrder -> shipOrder(order)
                    is DeliverOrder -> deliverOrder(order)
                    is CancelOrder -> cancelOrder(order, command.reason)
                }
            }
        }

    private fun placeOrder(command: PlaceOrder): CommandResult {
        val (customer, lines) = command
        if (customer.name.isEmpty()) return invalid("A customer name is required")
        if ('@' !in customer.email) return invalid("A valid customer email is required")
        if (lines.isEmpty()) return invalid("An order needs at least one line")
        for (line in lines) {
            if (line.sku.isEmpty()) return invalid("Each line needs a sku")
            if (line.unitPriceCents <= 0 || line.quantity <= 0) {
                return invalid("Line ${line.sku} needs a positive whole price and quantity")
            }
        }

        val totalCents = lines.sumOf { it.unitPriceCents * it.quantity }
        val order = OrderRow(
            id = db.nextOrderId(),
            customerEmail = customer.email,
            customerName = customer.name,
            lines = lines,
            totalCents = totalCents,
            placedAt = clock.now(),
        )
        db.orders[order.id] = order
        record(OrderPlaced(order.id, order.customerEmail, totalCents, order.placedAt))
        mailer.send(
            Email(
                to = order.customerEmail,
                subject = "Order ${order.id} confirmed",
                body = "Hello ${order.customerName}, we received your order of ${eur(totalCents)}.",
            )
        )
        return CommandResult.Accepted(order.id)
    }

    private fun payOrder(order: OrderRow, cardToken: String): CommandResult {
        if (order.isCancelled) return conflict("Order ${order.id} is cancelled")
        if (order.isPaid) return conflict("Order ${order.id} is already paid")

        when (val charge = cards.charge(cardToken, order.totalCents)) {
            is Charge.Declined -> return CommandResult.Rejected(Rejection.PAYMENT_DECLINED, charge.reason)
            is Charge.Approved -> {
                order.isPaid = true
                order.chargeId = charge.chargeId
            }
        }
        record(OrderPaid(order.id, order.totalCents, clock.now()))
        return CommandResult.Accepted(order.id)
    }

    private fun shipOrder(order: OrderRow): CommandResult {
        if (order.isCancelled) return conflict("Order ${order.id} is cancelled")
        if (!order.isPaid) return conflict("Order ${order.id} is not paid")
        if (order.isShipped) return conflict("Order ${order.id} has already shipped")

        order.isShipped = true
        record(OrderShipped(order.id, clock.now()))
        mailer.send(
            Email(
                to = order.customerEmail,
                subject = "Order ${order.id} shipped",
                body = "Hello ${order.customerName}, your order is on its way.",
            )
        )
        return CommandResult.Accepted(order.id)
    }

    private fun deliverOrder(order: OrderRow): CommandResult {
        if (!order.isShipped || order.isDelivered) return conflict("Order ${order.id} is not on its way")

        val deliveredAt = clock.now()
        order.isDelivered = true
        order.deliveredAt = deliveredAt
        record(OrderDelivered(order.id, deliveredAt))
        return CommandResult.Accepted(order.id)
    }

    private fun cancelOrder(order: OrderRow, reason: String): CommandResult {
        if (order.isShipped) return conflict("Order ${order.id} has already shipped")
        if (order.isCancelled) return conflict("Order ${order.id} is already cancelled")

        val chargeId = order.chargeId
        if (order.isPaid && chargeId != null) cards.refund(chargeId)
        order.isCancelled = true
        record(OrderCancelled(order.id, clock.now()))
        mailer.send(
            Email(
                to = order.customerEmail,
                subject = "Order ${order.id} cancelled",
                body = "Hello ${order.customerName}, your order was cancelled: $reason.",
            )
        )
        return CommandResult.Accepted(order.id)
    }

    // #region tour:record
    private fun record(event: OrderEvent) {
        for (projection in projections) projection.apply(event)
        val (topic, payload) = brokerMessageOf(event)
        broker.publish(topic, payload)
    }
    // #endregion
}

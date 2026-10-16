package orders

import infrastructure.CardProcessor
import infrastructure.Charge
import infrastructure.Email
import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase
import infrastructure.ManualClock
import infrastructure.OrderLineRow
import infrastructure.OrderRow
import infrastructure.SmtpMailer
import shop.eur
import web.HttpRequest
import web.HttpResponse
import web.Json
import web.Method
import web.wholeNumber

private fun reply(status: Int, body: Json) = HttpResponse(status, body)

private fun fail(status: Int, error: String) = reply(status, mapOf("error" to error))

class OrdersHandler(
    private val db: InMemoryDatabase,
    private val cards: CardProcessor,
    private val broker: FakeBroker,
    private val mailer: SmtpMailer,
    private val clock: ManualClock,
) {
    fun handle(request: HttpRequest): HttpResponse =
        try {
            route(request)
        } catch (error: InvalidTransitionException) {
            fail(409, error.message.orEmpty())
        }

    private fun route(request: HttpRequest): HttpResponse {
        val segments = request.path.split("/").drop(1)
        val resource = segments.getOrNull(0)
        val id = segments.getOrNull(1)
        val action = segments.getOrNull(2)
        return when {
            request.method == Method.POST && resource == "orders" && id == null -> placeOrder(request.body)
            request.method == Method.GET && resource == "orders" && id != null -> getOrder(id)
            request.method == Method.GET && resource == "customers" && id != null && action == "orders" ->
                getCustomerOrders(id)
            request.method == Method.POST && resource == "orders" && id != null -> {
                val order = db.orders[id] ?: return fail(404, "Order $id not found")
                when (action) {
                    "pay" -> payOrder(order, request.body)
                    "ship" -> shipOrder(order)
                    "deliver" -> deliverOrder(order)
                    "cancel" -> cancelOrder(order, request.body)
                    else -> noRoute(request)
                }
            }
            else -> noRoute(request)
        }
    }

    private fun placeOrder(body: Json): HttpResponse {
        val customer = body["customer"] as? Map<*, *>
        val name = customer?.get("name") as? String
        if (name.isNullOrEmpty()) return fail(400, "A customer name is required")
        val email = customer["email"] as? String
        if (email == null || '@' !in email) return fail(400, "A valid customer email is required")
        val lines = body["lines"] as? List<*>
        if (lines.isNullOrEmpty()) return fail(400, "An order needs at least one line")
        val rows = mutableListOf<OrderLineRow>()
        for (line in lines) {
            val fields = line as? Map<*, *>
            val sku = fields?.get("sku") as? String
            if (sku.isNullOrEmpty()) return fail(400, "Each line needs a sku")
            val unitPriceCents = fields.wholeNumber("unitPriceCents")
            val quantity = fields.wholeNumber("quantity")
            if (unitPriceCents == null || unitPriceCents <= 0 || quantity == null || quantity <= 0) {
                return fail(400, "Line $sku needs a positive whole price and quantity")
            }
            rows += OrderLineRow(sku, unitPriceCents, quantity)
        }

        val totalCents = rows.sumOf { it.unitPriceCents * it.quantity }
        val order = OrderRow(
            id = db.nextOrderId(),
            customerEmail = email,
            customerName = name,
            lines = rows,
            totalCents = totalCents,
            placedAt = clock.now(),
        )
        db.orders[order.id] = order
        broker.publish(
            "OrderPlaced",
            mapOf("orderId" to order.id, "customerEmail" to email, "totalCents" to totalCents),
        )
        mailer.send(
            Email(
                to = email,
                subject = "Order ${order.id} confirmed",
                body = "Hello $name, we received your order of ${eur(totalCents)}.",
            )
        )
        return reply(201, mapOf("orderId" to order.id, "totalCents" to totalCents))
    }

    // #region tour:guards
    private fun payOrder(order: OrderRow, body: Json): HttpResponse {
        val paid = transition(order.state, OrderAction.PAY, TransitionContext(clock.now()))
        val cardToken = body["cardToken"] as? String ?: return fail(400, "A card token is required")

        when (val charge = cards.charge(cardToken, order.totalCents)) {
            is Charge.Declined -> return fail(402, charge.reason)
            is Charge.Approved -> {
                order.state = paid
                order.chargeId = charge.chargeId
            }
        }
        broker.publish("OrderPaid", mapOf("orderId" to order.id, "totalCents" to order.totalCents))
        return statusReply(order)
    }
    // #endregion

    private fun shipOrder(order: OrderRow): HttpResponse {
        order.state = transition(order.state, OrderAction.SHIP, TransitionContext(clock.now()))
        broker.publish("OrderShipped", mapOf("orderId" to order.id))
        mailer.send(
            Email(
                to = order.customerEmail,
                subject = "Order ${order.id} shipped",
                body = "Hello ${order.customerName}, your order is on its way.",
            )
        )
        return statusReply(order)
    }

    private fun deliverOrder(order: OrderRow): HttpResponse {
        order.state = transition(order.state, OrderAction.DELIVER, TransitionContext(clock.now()))
        broker.publish("OrderDelivered", mapOf("orderId" to order.id))
        return statusReply(order)
    }

    private fun cancelOrder(order: OrderRow, body: Json): HttpResponse {
        val reason = body["reason"] as? String ?: "no reason given"
        order.state = transition(order.state, OrderAction.CANCEL, TransitionContext(clock.now(), reason))

        order.chargeId?.let(cards::refund)
        broker.publish("OrderCancelled", mapOf("orderId" to order.id))
        mailer.send(
            Email(
                to = order.customerEmail,
                subject = "Order ${order.id} cancelled",
                body = "Hello ${order.customerName}, your order was cancelled: $reason.",
            )
        )
        return statusReply(order)
    }

    private fun getOrder(id: String): HttpResponse {
        val order = db.orders[id] ?: return fail(404, "Order $id not found")
        return reply(
            200,
            mapOf(
                "orderId" to order.id,
                "status" to order.state.status.label(),
                "customerEmail" to order.customerEmail,
                "totalCents" to order.totalCents,
            ),
        )
    }

    private fun getCustomerOrders(email: String): HttpResponse {
        val orders = db.orders.values.filter { it.customerEmail == email }
        return reply(
            200,
            mapOf(
                "orderCount" to orders.size,
                "totalSpentCents" to orders.filterNot { it.state is OrderState.Cancelled }.sumOf { it.totalCents },
                "lastStatus" to orders.lastOrNull()?.state?.status?.label(),
            ),
        )
    }

    private fun statusReply(order: OrderRow) =
        reply(200, mapOf("orderId" to order.id, "status" to order.state.status.label()))

    private fun noRoute(request: HttpRequest) = fail(404, "No route for ${request.method} ${request.path}")
}

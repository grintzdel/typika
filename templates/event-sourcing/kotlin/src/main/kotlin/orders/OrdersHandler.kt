package orders

import infrastructure.CardProcessor
import infrastructure.Charge
import infrastructure.Email
import infrastructure.FakeBroker
import infrastructure.ManualClock
import infrastructure.SmtpMailer
import shop.eur
import web.HttpRequest
import web.HttpResponse
import web.Json
import web.Method
import web.wholeNumber

private fun reply(status: Int, body: Json) = HttpResponse(status, body)

private fun fail(status: Int, error: String) = reply(status, mapOf("error" to error))

private fun OrderStatus.label() = name.lowercase()

private fun failWith(rejected: Decision.Rejected): HttpResponse {
    val status = when (rejected.rejection) {
        Rejection.INVALID -> 400
        Rejection.NOT_FOUND -> 404
        Rejection.CONFLICT -> 409
    }
    return fail(status, rejected.reason)
}

private fun statusReply(order: Order) = reply(200, mapOf("orderId" to order.id, "status" to order.status.label()))

private fun readLines(lines: Any?): List<OrderLine>? =
    (lines as? List<*>)?.map { line ->
        val fields = line as? Map<*, *> ?: return null
        val sku = fields["sku"] as? String ?: return null
        val unitPriceCents = fields.wholeNumber("unitPriceCents") ?: return null
        val quantity = fields.wholeNumber("quantity") ?: return null
        OrderLine(sku, unitPriceCents, quantity)
    }

class OrdersHandler(
    private val store: InMemoryEventStore,
    private val history: CustomerHistory,
    private val cards: CardProcessor,
    private val broker: FakeBroker,
    private val mailer: SmtpMailer,
    private val clock: ManualClock,
) {
    fun handle(request: HttpRequest): HttpResponse {
        val segments = request.path.split("/").drop(1)
        val resource = segments.getOrNull(0)
        val id = segments.getOrNull(1)
        val action = segments.getOrNull(2)
        return when {
            request.method == Method.POST && resource == "orders" && id == null -> placeOrder(request.body)
            request.method == Method.GET && resource == "orders" && id != null -> getOrder(id)
            request.method == Method.GET && resource == "customers" && id != null && action == "orders" ->
                getCustomerOrders(id)
            request.method == Method.POST && resource == "orders" && id != null ->
                when (action) {
                    "pay" -> payOrder(id, request.body)
                    "ship" -> shipOrder(id)
                    "deliver" -> deliverOrder(id)
                    "cancel" -> cancelOrder(id, request.body)
                    else -> noRoute(request)
                }
            else -> noRoute(request)
        }
    }

    private fun placeOrder(body: Json): HttpResponse {
        val customer = body["customer"] as? Map<*, *>
        val name = customer?.get("name") as? String
        val email = customer?.get("email") as? String
        val lines = readLines(body["lines"])
        if (name == null || email == null || lines == null) return fail(400, "The order request is malformed")

        val orderId = "order-${store.streamCount() + 1}"
        return change(orderId, PlaceOrder(orderId, Customer(name, email), lines)) { order ->
            broker.publish(
                "OrderPlaced",
                mapOf("orderId" to orderId, "customerEmail" to order.customer.email, "totalCents" to order.totalCents),
            )
            mailer.send(
                Email(
                    to = order.customer.email,
                    subject = "Order $orderId confirmed",
                    body = "Hello ${order.customer.name}, we received your order of ${eur(order.totalCents)}.",
                )
            )
            reply(201, mapOf("orderId" to orderId, "totalCents" to order.totalCents))
        }
    }

    private fun payOrder(orderId: String, body: Json): HttpResponse {
        val current = rehydrate(store.load(orderId).events) ?: return fail(404, "Order $orderId not found")
        paymentRefusal(current)?.let { return failWith(it) }
        val cardToken = body["cardToken"] as? String ?: return fail(400, "A card token is required")

        val chargeId = when (val charge = cards.charge(cardToken, current.totalCents)) {
            is Charge.Declined -> return fail(402, charge.reason)
            is Charge.Approved -> charge.chargeId
        }
        return change(orderId, PayOrder(chargeId)) { order ->
            broker.publish("OrderPaid", mapOf("orderId" to orderId, "totalCents" to order.totalCents))
            statusReply(order)
        }
    }

    private fun shipOrder(orderId: String) =
        change(orderId, ShipOrder) { order ->
            broker.publish("OrderShipped", mapOf("orderId" to orderId))
            mailer.send(
                Email(
                    to = order.customer.email,
                    subject = "Order $orderId shipped",
                    body = "Hello ${order.customer.name}, your order is on its way.",
                )
            )
            statusReply(order)
        }

    private fun deliverOrder(orderId: String) =
        change(orderId, DeliverOrder) { order ->
            broker.publish("OrderDelivered", mapOf("orderId" to orderId))
            statusReply(order)
        }

    private fun cancelOrder(orderId: String, body: Json): HttpResponse {
        val reason = body["reason"] as? String ?: "no reason given"
        return change(orderId, CancelOrder(reason)) { order ->
            order.chargeId?.let(cards::refund)
            broker.publish("OrderCancelled", mapOf("orderId" to orderId))
            mailer.send(
                Email(
                    to = order.customer.email,
                    subject = "Order $orderId cancelled",
                    body = "Hello ${order.customer.name}, your order was cancelled: $reason.",
                )
            )
            statusReply(order)
        }
    }

    private fun getOrder(orderId: String): HttpResponse {
        val order = rehydrate(store.load(orderId).events) ?: return fail(404, "Order $orderId not found")
        return reply(
            200,
            mapOf(
                "orderId" to orderId,
                "status" to order.status.label(),
                "customerEmail" to order.customer.email,
                "totalCents" to order.totalCents,
            ),
        )
    }

    private fun getCustomerOrders(email: String): HttpResponse {
        val (orderCount, totalSpentCents, lastStatus) = history.forCustomer(email)
        return reply(
            200,
            mapOf(
                "orderCount" to orderCount,
                "totalSpentCents" to totalSpentCents,
                "lastStatus" to lastStatus?.label(),
            ),
        )
    }

    private fun change(orderId: String, command: OrderCommand, then: (Order) -> HttpResponse): HttpResponse {
        val (events, version) = store.load(orderId)
        return when (val decision = decide(rehydrate(events), command, clock.now())) {
            is Decision.Rejected -> failWith(decision)
            is Decision.Accepted -> {
                store.append(orderId, version, decision.events)
                then(checkNotNull(rehydrate(events + decision.events)))
            }
        }
    }

    private fun noRoute(request: HttpRequest) = fail(404, "No route for ${request.method} ${request.path}")
}

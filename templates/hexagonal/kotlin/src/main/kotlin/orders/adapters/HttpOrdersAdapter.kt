package orders.adapters

import orders.OrderUseCases
import orders.domain.Customer
import orders.domain.InvalidOrderException
import orders.domain.Order
import orders.domain.OrderConflictException
import orders.domain.OrderException
import orders.domain.OrderLineRequest
import orders.domain.OrderNotFoundException
import orders.domain.OrderRequest
import orders.domain.PaymentDeclinedException
import web.HttpRequest
import web.HttpResponse
import web.Json
import web.Method
import web.wholeNumber

private fun reply(status: Int, body: Json) = HttpResponse(status, body)

private fun fail(status: Int, error: String) = reply(status, mapOf("error" to error))

private fun Order.statusLabel() = status.name.lowercase()

private fun statusReply(order: Order) = reply(200, mapOf("orderId" to order.id, "status" to order.statusLabel()))

private fun orderReply(order: Order) =
    reply(
        200,
        mapOf(
            "orderId" to order.id,
            "status" to order.statusLabel(),
            "customerEmail" to order.customer.email,
            "totalCents" to order.total.cents,
        ),
    )

private fun readOrderRequest(body: Json): OrderRequest? {
    val customer = body["customer"] as? Map<*, *> ?: return null
    val name = customer["name"] as? String ?: return null
    val email = customer["email"] as? String ?: return null
    val lines = body["lines"] as? List<*> ?: return null
    val orderLines = lines.map { line ->
        val fields = line as? Map<*, *> ?: return null
        val sku = fields["sku"] as? String ?: return null
        val unitPriceCents = fields.wholeNumber("unitPriceCents") ?: return null
        val quantity = fields.wholeNumber("quantity") ?: return null
        OrderLineRequest(sku, unitPriceCents, quantity)
    }
    return OrderRequest(Customer(name, email), orderLines)
}

// #region tour:driving-adapter
private fun statusCodeOf(error: OrderException) =
    when (error) {
        is InvalidOrderException -> 400
        is PaymentDeclinedException -> 402
        is OrderNotFoundException -> 404
        is OrderConflictException -> 409
    }

class HttpOrdersAdapter(private val orders: OrderUseCases) {
    fun handle(request: HttpRequest): HttpResponse =
        try {
            route(request)
        } catch (error: OrderException) {
            fail(statusCodeOf(error), error.message.orEmpty())
        }
    // #endregion

    private fun route(request: HttpRequest): HttpResponse {
        val segments = request.path.split("/").drop(1)
        val resource = segments.getOrNull(0)
        val id = segments.getOrNull(1)
        val action = segments.getOrNull(2)
        val body = request.body
        return when {
            request.method == Method.POST && resource == "orders" && id == null -> {
                val orderRequest = readOrderRequest(body) ?: return fail(400, "The order request is malformed")
                val order = orders.placeOrder(orderRequest)
                reply(201, mapOf("orderId" to order.id, "totalCents" to order.total.cents))
            }
            request.method == Method.GET && resource == "orders" && id != null -> orderReply(orders.findOrder(id))
            request.method == Method.GET && resource == "customers" && id != null && action == "orders" -> {
                val (orderCount, totalSpent, lastStatus) = orders.customerHistory(id)
                reply(
                    200,
                    mapOf(
                        "orderCount" to orderCount,
                        "totalSpentCents" to totalSpent.cents,
                        "lastStatus" to lastStatus?.name?.lowercase(),
                    ),
                )
            }
            request.method == Method.POST && resource == "orders" && id != null ->
                when (action) {
                    "pay" -> {
                        val cardToken = body["cardToken"] as? String ?: return fail(400, "A card token is required")
                        statusReply(orders.payOrder(id, cardToken))
                    }
                    "ship" -> statusReply(orders.shipOrder(id))
                    "deliver" -> statusReply(orders.deliverOrder(id))
                    "cancel" -> statusReply(orders.cancelOrder(id, body["reason"] as? String ?: "no reason given"))
                    else -> noRoute(request)
                }
            else -> noRoute(request)
        }
    }

    private fun noRoute(request: HttpRequest) = fail(404, "No route for ${request.method} ${request.path}")
}

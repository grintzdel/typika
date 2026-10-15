package orders

import infrastructure.OrderLineRow
import orders.read.CustomerOrderSummaries
import orders.read.OrderViews
import orders.write.CancelOrder
import orders.write.CommandResult
import orders.write.CustomerDetails
import orders.write.DeliverOrder
import orders.write.OrderChange
import orders.write.OrderCommandHandler
import orders.write.PayOrder
import orders.write.PlaceOrder
import orders.write.Rejection
import orders.write.ShipOrder
import web.HttpRequest
import web.HttpResponse
import web.Json
import web.Method
import web.wholeNumber

private fun reply(status: Int, body: Json) = HttpResponse(status, body)

private fun fail(status: Int, error: String) = reply(status, mapOf("error" to error))

private fun OrderStatus.label() = name.lowercase()

private fun statusCodeOf(rejection: Rejection) =
    when (rejection) {
        Rejection.INVALID -> 400
        Rejection.PAYMENT_DECLINED -> 402
        Rejection.NOT_FOUND -> 404
        Rejection.CONFLICT -> 409
    }

private fun readPlaceOrder(body: Json): PlaceOrder? {
    val customer = body["customer"] as? Map<*, *> ?: return null
    val name = customer["name"] as? String ?: return null
    val email = customer["email"] as? String ?: return null
    val lines = body["lines"] as? List<*> ?: return null
    val rows = lines.map { line ->
        val fields = line as? Map<*, *> ?: return null
        val sku = fields["sku"] as? String ?: return null
        val unitPriceCents = fields.wholeNumber("unitPriceCents") ?: return null
        val quantity = fields.wholeNumber("quantity") ?: return null
        OrderLineRow(sku, unitPriceCents, quantity)
    }
    return PlaceOrder(CustomerDetails(name, email), rows)
}

private fun readOrderChange(orderId: String, action: String?, body: Json): OrderChange? =
    when (action) {
        "pay" -> (body["cardToken"] as? String)?.let { PayOrder(orderId, it) }
        "ship" -> ShipOrder(orderId)
        "deliver" -> DeliverOrder(orderId)
        "cancel" -> CancelOrder(orderId, body["reason"] as? String ?: "no reason given")
        else -> null
    }

class OrdersHandler(
    private val commands: OrderCommandHandler,
    private val orderViews: OrderViews,
    private val customerSummaries: CustomerOrderSummaries,
) {
    // #region tour:routes
    fun handle(request: HttpRequest): HttpResponse {
        val segments = request.path.split("/").drop(1)
        val resource = segments.getOrNull(0)
        val id = segments.getOrNull(1)
        val action = segments.getOrNull(2)
        return when {
            request.method == Method.POST && resource == "orders" && id == null -> {
                val command = readPlaceOrder(request.body) ?: return fail(400, "The order request is malformed")
                replyTo(commands.execute(command), 201)
            }
            request.method == Method.POST && resource == "orders" && id != null -> {
                val command = readOrderChange(id, action, request.body)
                    ?: return fail(400, "Cannot ${action ?: "update"} order $id with this request")
                replyTo(commands.execute(command), 200)
            }
            request.method == Method.GET && resource == "orders" && id != null -> {
                val view = orderViews.find(id) ?: return fail(404, "Order $id not found")
                reply(
                    200,
                    mapOf(
                        "orderId" to view.orderId,
                        "status" to view.status.label(),
                        "customerEmail" to view.customerEmail,
                        "totalCents" to view.totalCents,
                    ),
                )
            }
            request.method == Method.GET && resource == "customers" && id != null && action == "orders" -> {
                val (orderCount, totalSpentCents, lastStatus) = customerSummaries.forCustomer(id)
                reply(
                    200,
                    mapOf(
                        "orderCount" to orderCount,
                        "totalSpentCents" to totalSpentCents,
                        "lastStatus" to lastStatus?.label(),
                    ),
                )
            }
            else -> fail(404, "No route for ${request.method} ${request.path}")
        }
    }
    // #endregion

    private fun replyTo(result: CommandResult, status: Int): HttpResponse {
        val orderId = when (result) {
            is CommandResult.Rejected -> return fail(statusCodeOf(result.rejection), result.reason)
            is CommandResult.Accepted -> result.orderId
        }
        val view = orderViews.find(orderId) ?: return fail(500, "Order $orderId has no view")
        return if (status == 201) {
            reply(201, mapOf("orderId" to view.orderId, "totalCents" to view.totalCents))
        } else {
            reply(200, mapOf("orderId" to view.orderId, "status" to view.status.label()))
        }
    }
}

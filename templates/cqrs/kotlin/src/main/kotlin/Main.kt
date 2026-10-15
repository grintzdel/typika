import app.openShop
import web.HttpRequest
import web.Json
import web.Method

fun main() {
    val http = openShop().http

    fun call(method: Method, path: String, body: Json = emptyMap()) {
        val response = http.handle(HttpRequest(method, path, body))
        println("$method $path -> ${response.status} ${response.body}")
    }

    val ada = mapOf("name" to "Ada", "email" to "ada@example.com")
    call(
        Method.POST,
        "/orders",
        mapOf(
            "customer" to ada,
            "lines" to listOf(
                mapOf("sku" to "MUG-01", "unitPriceCents" to 1200, "quantity" to 2),
                mapOf("sku" to "TEA-GREEN", "unitPriceCents" to 850, "quantity" to 1),
            ),
        ),
    )
    call(Method.POST, "/orders/order-1/pay", mapOf("cardToken" to "tok_visa"))
    call(Method.POST, "/orders/order-1/ship")
    call(
        Method.POST,
        "/orders",
        mapOf(
            "customer" to ada,
            "lines" to listOf(mapOf("sku" to "KETTLE-01", "unitPriceCents" to 5990, "quantity" to 1)),
        ),
    )
    call(Method.POST, "/orders/order-2/cancel", mapOf("reason" to "ordered twice"))
    call(Method.GET, "/customers/ada@example.com/orders")
}

package app

import web.HttpRequest
import web.Json
import web.Method

val ada = mapOf("name" to "Ada", "email" to "ada@example.com")

val grace = mapOf("name" to "Grace", "email" to "grace@example.com")

fun orderOf(customer: Map<String, String>, totalCents: Int): Json =
    mapOf(
        "customer" to customer,
        "lines" to listOf(mapOf("sku" to "TEST-SKU", "unitPriceCents" to totalCents, "quantity" to 1)),
    )

fun Shop.post(path: String, body: Json = emptyMap()) = http.handle(HttpRequest(Method.POST, path, body))

fun Shop.get(path: String) = http.handle(HttpRequest(Method.GET, path))

fun Shop.placeOrder(body: Json) = post("/orders", body).body["orderId"].toString()

fun Shop.statusOf(orderId: String) = get("/orders/$orderId").body["status"]

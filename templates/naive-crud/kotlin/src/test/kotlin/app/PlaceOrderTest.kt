package app

import web.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals

class PlaceOrderTest {
    @Test
    fun `saves a pending order and returns its id and total`() {
        val shop = openShop()

        val response = shop.post(
            "/orders",
            mapOf(
                "customer" to ada,
                "lines" to listOf(
                    mapOf("sku" to "MUG-01", "unitPriceCents" to 1200, "quantity" to 2),
                    mapOf("sku" to "TEA-GREEN", "unitPriceCents" to 850, "quantity" to 1),
                ),
            ),
        )

        assertEquals(HttpResponse(201, mapOf("orderId" to "order-1", "totalCents" to 3250)), response)
        assertEquals(
            mapOf(
                "orderId" to "order-1",
                "status" to "pending",
                "customerEmail" to "ada@example.com",
                "totalCents" to 3250,
            ),
            shop.get("/orders/order-1").body,
        )
    }

    @Test
    fun `gives every order its own id`() {
        val shop = openShop()

        assertEquals("order-1", shop.placeOrder(orderOf(ada, 1000)))
        assertEquals("order-2", shop.placeOrder(orderOf(grace, 2000)))
    }

    @Test
    fun `rejects an order without a valid customer email`() {
        val response = openShop().post("/orders", orderOf(mapOf("name" to "Ada", "email" to "ada"), 1000))

        assertEquals(400, response.status)
    }

    @Test
    fun `rejects an order without lines`() {
        val response = openShop().post("/orders", mapOf("customer" to ada, "lines" to emptyList<Any>()))

        assertEquals(400, response.status)
    }

    @Test
    fun `rejects a line with a quantity that is not a positive whole number`() {
        val response = openShop().post(
            "/orders",
            mapOf(
                "customer" to ada,
                "lines" to listOf(mapOf("sku" to "MUG-01", "unitPriceCents" to 1200, "quantity" to 0.5)),
            ),
        )

        assertEquals(400, response.status)
    }

    @Test
    fun `saves, publishes and sends nothing for a rejected order`() {
        val shop = openShop()

        shop.post("/orders", mapOf("customer" to ada, "lines" to emptyList<Any>()))

        assertEquals(404, shop.get("/orders/order-1").status)
        assertEquals(emptyList(), shop.broker.published)
        assertEquals(emptyList(), shop.mailer.sent)
    }

    @Test
    fun `finds nothing for an unknown order`() {
        assertEquals(404, openShop().get("/orders/order-9").status)
    }
}

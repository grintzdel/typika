package app

import kotlin.test.Test
import kotlin.test.assertEquals

class OutboxRelayTest {
    @Test
    fun `keeps the event while the broker is down and publishes it once it is back`() {
        val shop = openShop()
        shop.broker.goDown()
        shop.placeOrder(orderOf(ada, 3250))

        assertEquals(0, shop.relay.publishPending())
        shop.broker.comeBack()

        assertEquals(1, shop.relay.publishPending())
        assertEquals(0, shop.relay.publishPending())
        assertEquals(listOf("OrderPlaced"), shop.broker.published.map { it.topic })
    }
}

package orders

import shop.ada
import shop.eur
import shop.orderOf
import kotlin.test.Test
import kotlin.test.assertEquals

private val orderPlaced = OrderPlaced("order-1", orderOf(ada, 1000), eur(1000))

class OrderEventsTest {
    @Test
    fun `notifies every subscriber of a published event`() {
        val events = OrderEvents {}
        val received = mutableListOf<String>()
        events.subscribe { received += "first ${it.orderId}" }
        events.subscribe { received += "second ${it.orderId}" }

        events.publish(orderPlaced)

        assertEquals(listOf("first order-1", "second order-1"), received)
    }

    @Test
    fun `stops notifying a subscriber once it unsubscribes`() {
        val events = OrderEvents {}
        val received = mutableListOf<OrderPlaced>()
        val unsubscribe = events.subscribe { received += it }

        unsubscribe()
        events.publish(orderPlaced)

        assertEquals(emptyList(), received)
    }

    @Test
    fun `keeps notifying the other subscribers when one throws`() {
        val events = OrderEvents {}
        val received = mutableListOf<OrderPlaced>()
        events.subscribe { throw IllegalStateException("Stock service timed out") }
        events.subscribe { received += it }

        events.publish(orderPlaced)

        assertEquals(listOf(orderPlaced), received)
    }

    @Test
    fun `reports the error of a failing subscriber`() {
        val reported = mutableListOf<Exception>()
        val events = OrderEvents { reported += it }
        val failure = IllegalStateException("Stock service timed out")
        events.subscribe { throw failure }

        events.publish(orderPlaced)

        assertEquals(listOf<Exception>(failure), reported)
    }
}

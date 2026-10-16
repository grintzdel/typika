package orders

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.time.Instant

class OrderStateTest {
    private val at = TransitionContext(Instant.parse("2026-10-03T09:00:00Z"))

    @Test
    fun `moves a paid order to shipped`() {
        assertEquals(OrderState.Shipped, transition(OrderState.Paid, OrderAction.SHIP, at))
    }

    @Test
    fun `keeps the delivery date in the delivered state`() {
        assertEquals(OrderState.Delivered(at.at), transition(OrderState.Shipped, OrderAction.DELIVER, at))
    }

    @Test
    fun `refuses a transition the table does not list, with a typed error`() {
        val error = assertFailsWith<InvalidTransitionException> {
            transition(OrderState.Pending, OrderAction.DELIVER, at)
        }

        assertEquals(OrderStatus.PENDING, error.from)
        assertEquals("Cannot deliver an order that is pending", error.message)
    }
}

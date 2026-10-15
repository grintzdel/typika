package infrastructure

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TransactionTest {
    @Test
    fun `keeps the order and its outbox entry together when the work fails`() {
        val db = InMemoryDatabase()

        val failure = assertFailsWith<IllegalStateException> {
            db.transaction {
                val id = db.nextOrderId()
                db.addToOutbox("OrderPlaced", mapOf("orderId" to id))
                error("disk full")
            }
        }

        assertEquals("disk full", failure.message)
        assertEquals(emptyList(), db.outbox)
        assertEquals("order-1", db.nextOrderId())
    }
}

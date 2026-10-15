package orders

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.time.Instant

private val occurredAt = Instant.parse("2026-10-01T09:00:00Z")

private val placed = OrderPlaced(
    "order-1",
    Customer("Ada", "ada@example.com"),
    listOf(OrderLine("MUG-01", 1200, 2)),
    totalCents = 2400,
    occurredAt = occurredAt,
)

private val shipped = OrderShipped("order-1", occurredAt)

class EventStoreTest {
    @Test
    fun `appends events and moves the stream to the next version`() {
        val store = InMemoryEventStore()

        store.append("order-1", 0, listOf(placed))
        store.append("order-1", 1, listOf(shipped))

        assertEquals(Stream(listOf(placed, shipped), version = 2), store.load("order-1"))
    }

    @Test
    fun `refuses an append made from a stale version`() {
        val store = InMemoryEventStore()
        store.append("order-1", 0, listOf(placed))
        val (_, version) = store.load("order-1")
        store.append("order-1", version, listOf(OrderCancelled("order-1", "too slow", occurredAt)))

        assertFailsWith<ConcurrencyException> { store.append("order-1", version, listOf(shipped)) }
    }

    @Test
    fun `leaves the stream untouched when an append is refused`() {
        val store = InMemoryEventStore()
        store.append("order-1", 0, listOf(placed))

        assertFailsWith<ConcurrencyException> { store.append("order-1", 0, listOf(placed)) }
        assertEquals(listOf<OrderEvent>(placed), store.load("order-1").events)
    }
}

package orders

data class Stream(val events: List<OrderEvent>, val version: Int)

class ConcurrencyException(message: String) : RuntimeException(message)

// #region tour:event-store
class InMemoryEventStore {
    private val streams = mutableMapOf<String, List<OrderEvent>>()
    private val subscribers = mutableListOf<(OrderEvent) -> Unit>()

    fun load(streamId: String): Stream {
        val events = streams[streamId].orEmpty()
        return Stream(events, version = events.size)
    }

    fun append(streamId: String, expectedVersion: Int, events: List<OrderEvent>) {
        val current = streams[streamId].orEmpty()
        if (current.size != expectedVersion) {
            throw ConcurrencyException("$streamId is at version ${current.size}, not $expectedVersion")
        }
        streams[streamId] = current + events
        for (event in events) for (subscriber in subscribers) subscriber(event)
    }
    // #endregion

    fun streamCount() = streams.size

    fun subscribe(subscriber: (OrderEvent) -> Unit) {
        subscribers += subscriber
    }
}

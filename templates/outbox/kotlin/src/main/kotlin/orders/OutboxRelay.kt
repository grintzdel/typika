package orders

import infrastructure.FakeBroker
import infrastructure.InMemoryDatabase

// #region tour:relay
class OutboxRelay(private val db: InMemoryDatabase, private val broker: FakeBroker) {
    fun publishPending(): Int {
        var published = 0
        for (entry in db.outbox) {
            if (entry.published) continue
            try {
                broker.publish(entry.topic, entry.payload)
            } catch (unavailable: IllegalStateException) {
                return published
            }
            entry.published = true
            published += 1
        }
        return published
    }
}
// #endregion

import type { FakeBroker } from '../infrastructure/fake-broker.ts'
import type { InMemoryDatabase } from '../infrastructure/in-memory-database.ts'

// #region tour:relay
export class OutboxRelay {
  private readonly db: InMemoryDatabase
  private readonly broker: FakeBroker

  constructor(db: InMemoryDatabase, broker: FakeBroker) {
    this.db = db
    this.broker = broker
  }

  publishPending(): number {
    let published = 0
    for (const entry of this.db.outbox) {
      if (entry.published) continue
      try {
        this.broker.publish(entry.topic, entry.payload)
      } catch {
        return published
      }
      entry.published = true
      published += 1
    }
    return published
  }
}
// #endregion

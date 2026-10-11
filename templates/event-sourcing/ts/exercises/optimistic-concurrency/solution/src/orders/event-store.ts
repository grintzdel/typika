import type { OrderEvent } from './order-events.ts'

export type Stream = {
  readonly events: readonly OrderEvent[]
  readonly version: number
}

export class ConcurrencyError extends Error {}

// #region tour:event-store
export class InMemoryEventStore {
  private readonly streams = new Map<string, readonly OrderEvent[]>()
  private readonly subscribers: ((event: OrderEvent) => void)[] = []

  load(streamId: string): Stream {
    const events = this.streams.get(streamId) ?? []
    return { events, version: events.length }
  }

  append(streamId: string, expectedVersion: number, events: readonly OrderEvent[]): void {
    const current = this.streams.get(streamId) ?? []
    if (current.length !== expectedVersion) {
      throw new ConcurrencyError(`${streamId} is at version ${current.length}, not ${expectedVersion}`)
    }
    this.streams.set(streamId, [...current, ...events])
    for (const event of events) for (const subscriber of this.subscribers) subscriber(event)
  }
  // #endregion

  streamCount(): number {
    return this.streams.size
  }

  subscribe(subscriber: (event: OrderEvent) => void): void {
    this.subscribers.push(subscriber)
  }
}

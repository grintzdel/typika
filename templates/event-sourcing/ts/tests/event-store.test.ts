import { describe, expect, it } from 'vitest'
import { ConcurrencyError, InMemoryEventStore } from '../src/orders/event-store.ts'
import type { OrderEvent } from '../src/orders/order-events.ts'

const occurredAt = new Date('2026-10-01T09:00:00Z')

const placed: OrderEvent = {
  type: 'OrderPlaced',
  orderId: 'order-1',
  customer: { name: 'Ada', email: 'ada@example.com' },
  lines: [{ sku: 'MUG-01', unitPriceCents: 1200, quantity: 2 }],
  totalCents: 2400,
  occurredAt,
}

describe('InMemoryEventStore', () => {
  it('appends events and moves the stream to the next version', () => {
    const store = new InMemoryEventStore()

    store.append('order-1', 0, [placed])
    store.append('order-1', 1, [{ type: 'OrderShipped', orderId: 'order-1', occurredAt }])

    expect(store.load('order-1').version).toBe(2)
    expect(store.load('order-1').events.map((event) => event.type)).toEqual(['OrderPlaced', 'OrderShipped'])
  })

  it('refuses an append made from a stale version', () => {
    const store = new InMemoryEventStore()
    store.append('order-1', 0, [placed])
    const { version } = store.load('order-1')
    store.append('order-1', version, [{ type: 'OrderCancelled', orderId: 'order-1', reason: 'too slow', occurredAt }])

    expect(() =>
      store.append('order-1', version, [{ type: 'OrderShipped', orderId: 'order-1', occurredAt }])
    ).toThrow(ConcurrencyError)
  })

  it('leaves the stream untouched when an append is refused', () => {
    const store = new InMemoryEventStore()
    store.append('order-1', 0, [placed])

    expect(() => store.append('order-1', 0, [placed])).toThrow(ConcurrencyError)
    expect(store.load('order-1').events).toEqual([placed])
  })
})

import { describe, expect, it } from 'vitest'
import type { OrderEvent } from '../src/orders/order-events.ts'
import { decide, rehydrate } from '../src/orders/order.ts'

const at = (day: number) => new Date(`2026-10-0${day}T09:00:00Z`)

const history: OrderEvent[] = [
  {
    type: 'OrderPlaced',
    orderId: 'order-1',
    customer: { name: 'Ada', email: 'ada@example.com' },
    lines: [{ sku: 'MUG-01', unitPriceCents: 1200, quantity: 2 }],
    totalCents: 2400,
    occurredAt: at(1),
  },
  { type: 'OrderPaid', orderId: 'order-1', chargeId: 'ch_1', totalCents: 2400, occurredAt: at(2) },
]

describe('order', () => {
  it('rebuilds an order by replaying its events', () => {
    expect(rehydrate(history)).toEqual({
      id: 'order-1',
      customer: { name: 'Ada', email: 'ada@example.com' },
      totalCents: 2400,
      status: 'paid',
      chargeId: 'ch_1',
    })
  })

  it('records why and when an order was cancelled', () => {
    const decision = decide(rehydrate(history), { type: 'CancelOrder', reason: 'ordered twice' }, at(3))

    expect(decision).toEqual({
      accepted: true,
      events: [{ type: 'OrderCancelled', orderId: 'order-1', reason: 'ordered twice', occurredAt: at(3) }],
    })
  })
})

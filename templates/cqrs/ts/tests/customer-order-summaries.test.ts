import { describe, expect, it } from 'vitest'
import { CustomerOrderSummaries } from '../src/orders/read/customer-order-summaries.ts'

const occurredAt = new Date('2026-10-01T09:00:00Z')

const placed = (orderId: string, totalCents: number) =>
  ({ type: 'OrderPlaced', orderId, customerEmail: 'ada@example.com', totalCents, occurredAt }) as const

const paid = (orderId: string, totalCents: number) => ({ type: 'OrderPaid', orderId, totalCents, occurredAt }) as const

describe('CustomerOrderSummaries', () => {
  it('builds a summary from events alone, without reading any order', () => {
    const summaries = new CustomerOrderSummaries()

    summaries.apply(placed('order-1', 3250))
    summaries.apply(paid('order-1', 3250))

    expect(summaries.forCustomer('ada@example.com')).toEqual({
      orderCount: 1,
      totalSpentCents: 3250,
      lastStatus: 'paid',
    })
  })

  it('shows the status of the latest order, whatever happens to older ones', () => {
    const summaries = new CustomerOrderSummaries()

    summaries.apply(placed('order-1', 3250))
    summaries.apply(placed('order-2', 1000))
    summaries.apply(paid('order-1', 3250))

    expect(summaries.forCustomer('ada@example.com').lastStatus).toBe('pending')
  })
})

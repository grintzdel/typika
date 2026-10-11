import { describe, expect, it } from 'vitest'
import type { Message } from '../src/infrastructure/fake-broker.ts'
import { LoyaltyPoints } from '../src/loyalty/loyalty-points.ts'

const orderPlaced = (orderId: string, totalCents: number): Message => ({
  topic: 'OrderPlaced',
  payload: { orderId, customerEmail: 'ada@example.com', totalCents },
})

describe('LoyaltyPoints', () => {
  it('awards one point per whole euro of each order', () => {
    const loyalty = new LoyaltyPoints()

    loyalty.handle(orderPlaced('order-1', 3250))
    loyalty.handle(orderPlaced('order-2', 1000))

    expect(loyalty.pointsOf('ada@example.com')).toBe(42)
  })

  it('awards the points of an order once, however many times it is delivered', () => {
    const loyalty = new LoyaltyPoints()

    loyalty.handle(orderPlaced('order-1', 3250))
    loyalty.handle(orderPlaced('order-1', 3250))

    expect(loyalty.pointsOf('ada@example.com')).toBe(32)
  })
})

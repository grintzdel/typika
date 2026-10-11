import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, orderOf, placeOrder, post } from './shop-fixture.ts'

describe('order events', () => {
  it('publishes OrderPlaced with the order total', () => {
    const shop = openShop()

    placeOrder(shop, orderOf(ada, 3250))

    expect(shop.broker.published).toEqual([
      { topic: 'OrderPlaced', payload: { orderId: 'order-1', customerEmail: 'ada@example.com', totalCents: 3250 } },
    ])
  })

  it('publishes an event for each step of the order', () => {
    const shop = openShop()
    const shipped = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${shipped}/pay`, { cardToken: 'tok_visa' })
    post(shop, `/orders/${shipped}/ship`)
    const cancelled = placeOrder(shop, orderOf(ada, 1000))
    post(shop, `/orders/${cancelled}/cancel`, { reason: 'ordered twice' })

    expect(shop.broker.published.map((message) => message.topic)).toEqual([
      'OrderPlaced',
      'OrderPaid',
      'OrderShipped',
      'OrderPlaced',
      'OrderCancelled',
    ])
  })
})

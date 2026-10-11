import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, grace, orderOf, placeOrder } from './shop-fixture.ts'

describe('broker outage', () => {
  it('places and confirms the order while the broker is down', () => {
    const shop = openShop()
    shop.broker.goDown()

    const orderId = placeOrder(shop, orderOf(ada, 3250))

    expect(get(shop, `/orders/${orderId}`).body.status).toBe('pending')
    expect(shop.mailer.sent).toHaveLength(1)
  })

  it('publishes the missed event once the broker is back', () => {
    const shop = openShop()
    shop.broker.goDown()
    placeOrder(shop, orderOf(ada, 3250))

    shop.broker.comeBack()
    shop.relay.publishPending()

    expect(shop.broker.published).toEqual([
      { topic: 'OrderPlaced', payload: { orderId: 'order-1', customerEmail: 'ada@example.com', totalCents: 3250 } },
    ])
  })

  it('publishes missed events before new ones, and each one once', () => {
    const shop = openShop()
    shop.broker.goDown()
    placeOrder(shop, orderOf(ada, 3250))
    shop.broker.comeBack()

    placeOrder(shop, orderOf(grace, 1000))
    shop.relay.publishPending()

    expect(shop.broker.published.map((message) => message.payload.orderId)).toEqual(['order-1', 'order-2'])
  })
})

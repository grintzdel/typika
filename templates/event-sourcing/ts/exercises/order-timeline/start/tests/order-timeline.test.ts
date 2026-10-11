import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, orderOf, placeOrder, post } from './shop-fixture.ts'

describe('order timeline', () => {
  it('lists what happened to an order, when, and why it was cancelled', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    shop.clock.advanceDays(1)
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })
    shop.clock.advanceDays(2)
    post(shop, `/orders/${orderId}/cancel`, { reason: 'ordered twice' })

    expect(get(shop, `/orders/${orderId}/timeline`)).toEqual({
      status: 200,
      body: {
        timeline: [
          { event: 'OrderPlaced', at: '2026-10-01T09:00:00.000Z' },
          { event: 'OrderPaid', at: '2026-10-02T09:00:00.000Z' },
          { event: 'OrderCancelled', at: '2026-10-04T09:00:00.000Z', reason: 'ordered twice' },
        ],
      },
    })
  })

  it('leaves out the actions the shop refused', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/ship`)
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_refused' })

    expect(get(shop, `/orders/${orderId}/timeline`).body).toEqual({
      timeline: [{ event: 'OrderPlaced', at: '2026-10-01T09:00:00.000Z' }],
    })
  })

  it('answers 404 for an unknown order', () => {
    expect(get(openShop(), '/orders/order-9/timeline').status).toBe(404)
  })
})

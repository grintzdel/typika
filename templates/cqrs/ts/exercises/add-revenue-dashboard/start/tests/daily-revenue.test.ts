import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, grace, orderOf, placeOrder, post, type Shop } from './shop-fixture.ts'

const dailyRevenue = (shop: Shop) => get(shop, '/revenue/daily')

describe('daily revenue dashboard', () => {
  it('adds each payment to the day it was paid, not the day it was placed', () => {
    const shop = openShop()
    const first = placeOrder(shop, orderOf(ada, 3250))
    shop.clock.advanceDays(1)
    post(shop, `/orders/${first}/pay`, { cardToken: 'tok_visa' })
    const second = placeOrder(shop, orderOf(grace, 1000))
    post(shop, `/orders/${second}/pay`, { cardToken: 'tok_visa' })
    placeOrder(shop, orderOf(ada, 500))

    expect(dailyRevenue(shop)).toEqual({
      status: 200,
      body: { days: [{ day: '2026-10-02', salesCents: 4250, refundsCents: 0 }] },
    })
  })

  it('counts a refund on the day the paid order is cancelled', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })
    shop.clock.advanceDays(2)
    post(shop, `/orders/${orderId}/cancel`, { reason: 'changed my mind' })

    expect(dailyRevenue(shop).body).toEqual({
      days: [
        { day: '2026-10-01', salesCents: 3250, refundsCents: 0 },
        { day: '2026-10-03', salesCents: 0, refundsCents: 3250 },
      ],
    })
  })

  it('shows nothing for an order cancelled before it was paid', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/cancel`, { reason: 'ordered twice' })

    expect(dailyRevenue(shop).body).toEqual({ days: [] })
  })
})

import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, orderOf, placeOrder, post, type Shop } from './shop-fixture.ts'

const deliveredOrder = (shop: Shop) => {
  const orderId = placeOrder(shop, orderOf(ada, 3250))
  post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })
  post(shop, `/orders/${orderId}/ship`)
  post(shop, `/orders/${orderId}/deliver`)
  return orderId
}

describe('returns', () => {
  it('takes back a delivered order within 14 days and refunds it', () => {
    const shop = openShop()
    const orderId = deliveredOrder(shop)
    shop.clock.advanceDays(14)

    expect(post(shop, `/orders/${orderId}/return`)).toEqual({ status: 200, body: { orderId, status: 'returned' } })
    expect(get(shop, `/orders/${orderId}`).body.status).toBe('returned')
    expect(shop.cards.refunded).toEqual(['ch_1'])
  })

  it('refuses a return after 14 days', () => {
    const shop = openShop()
    const orderId = deliveredOrder(shop)
    shop.clock.advanceDays(15)

    expect(post(shop, `/orders/${orderId}/return`).status).toBe(409)
    expect(get(shop, `/orders/${orderId}`).body.status).toBe('delivered')
    expect(shop.cards.refunded).toEqual([])
  })

  it('refuses to return an order that was not delivered', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })
    post(shop, `/orders/${orderId}/ship`)

    expect(post(shop, `/orders/${orderId}/return`).status).toBe(409)
    expect(get(shop, `/orders/${orderId}`).body.status).toBe('shipped')
  })

  it('accepts nothing more once an order is returned', () => {
    const shop = openShop()
    const orderId = deliveredOrder(shop)
    post(shop, `/orders/${orderId}/return`)

    expect(post(shop, `/orders/${orderId}/return`).status).toBe(409)
    expect(post(shop, `/orders/${orderId}/cancel`, { reason: 'too late' }).status).toBe(409)
    expect(post(shop, `/orders/${orderId}/deliver`).status).toBe(409)
    expect(shop.cards.refunded).toEqual(['ch_1'])
  })
})

import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, grace, orderOf, placeOrder, post } from './shop-fixture.ts'

describe('customer order history', () => {
  it('counts the orders, sums what was spent and shows the last status', () => {
    const shop = openShop()
    const first = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${first}/pay`, { cardToken: 'tok_visa' })
    placeOrder(shop, orderOf(grace, 9900))
    const second = placeOrder(shop, orderOf(ada, 1000))
    post(shop, `/orders/${second}/pay`, { cardToken: 'tok_visa' })

    expect(get(shop, '/customers/ada@example.com/orders').body).toEqual({
      orderCount: 2,
      totalSpentCents: 4250,
      lastStatus: 'paid',
    })
  })

  it('leaves cancelled orders out of the amount spent', () => {
    const shop = openShop()
    placeOrder(shop, orderOf(ada, 3250))
    const cancelled = placeOrder(shop, orderOf(ada, 1000))
    post(shop, `/orders/${cancelled}/cancel`, { reason: 'ordered twice' })

    expect(get(shop, '/customers/ada@example.com/orders').body).toEqual({
      orderCount: 2,
      totalSpentCents: 3250,
      lastStatus: 'cancelled',
    })
  })

  it('shows an empty history for a customer without orders', () => {
    expect(get(openShop(), '/customers/ada@example.com/orders').body).toEqual({
      orderCount: 0,
      totalSpentCents: 0,
      lastStatus: null,
    })
  })
})

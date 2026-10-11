import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, orderOf, placeOrder, post } from './shop-fixture.ts'

describe('customer notifications', () => {
  it('emails a confirmation with the order total', () => {
    const shop = openShop()

    placeOrder(shop, orderOf(ada, 3250))

    expect(shop.mailer.sent).toEqual([
      {
        to: 'ada@example.com',
        subject: 'Order order-1 confirmed',
        body: 'Hello Ada, we received your order of 32.50 EUR.',
      },
    ])
  })

  it('emails the customer when the order ships', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })

    post(shop, `/orders/${orderId}/ship`)

    expect(shop.mailer.sent.at(-1)).toEqual({
      to: 'ada@example.com',
      subject: 'Order order-1 shipped',
      body: 'Hello Ada, your order is on its way.',
    })
  })

  it('emails the reason when the order is cancelled', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))

    post(shop, `/orders/${orderId}/cancel`, { reason: 'ordered twice' })

    expect(shop.mailer.sent.at(-1)).toEqual({
      to: 'ada@example.com',
      subject: 'Order order-1 cancelled',
      body: 'Hello Ada, your order was cancelled: ordered twice.',
    })
  })
})

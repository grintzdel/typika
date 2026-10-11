import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, orderOf, placeOrder, post } from './shop-fixture.ts'

const statusOf = (shop: ReturnType<typeof openShop>, orderId: string) => get(shop, `/orders/${orderId}`).body.status

describe('order lifecycle', () => {
  it('pays an order with an accepted card', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))

    const response = post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })

    expect(response).toEqual({ status: 200, body: { orderId, status: 'paid' } })
  })

  it('keeps the order pending when the card is declined', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))

    const response = post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_refused' })

    expect(response.status).toBe(402)
    expect(statusOf(shop, orderId)).toBe('pending')
  })

  it('refuses to ship an order that is not paid', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))

    expect(post(shop, `/orders/${orderId}/ship`).status).toBe(409)
    expect(statusOf(shop, orderId)).toBe('pending')
  })

  it('ships then delivers a paid order', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })

    expect(post(shop, `/orders/${orderId}/ship`).body.status).toBe('shipped')
    expect(post(shop, `/orders/${orderId}/deliver`).body.status).toBe('delivered')
  })

  it('cancels a pending order without refunding anything', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))

    expect(post(shop, `/orders/${orderId}/cancel`, { reason: 'ordered twice' }).body.status).toBe('cancelled')
    expect(shop.cards.refunded).toEqual([])
  })

  it('refunds a paid order when it is cancelled', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })

    post(shop, `/orders/${orderId}/cancel`, { reason: 'ordered twice' })

    expect(shop.cards.refunded).toEqual(['ch_1'])
  })

  it('refuses to cancel an order that has shipped', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' })
    post(shop, `/orders/${orderId}/ship`)

    expect(post(shop, `/orders/${orderId}/cancel`, { reason: 'too late' }).status).toBe(409)
    expect(statusOf(shop, orderId)).toBe('shipped')
  })

  it('refuses to pay a cancelled order', () => {
    const shop = openShop()
    const orderId = placeOrder(shop, orderOf(ada, 3250))
    post(shop, `/orders/${orderId}/cancel`, { reason: 'ordered twice' })

    expect(post(shop, `/orders/${orderId}/pay`, { cardToken: 'tok_visa' }).status).toBe(409)
  })

  it('answers 404 for an unknown order', () => {
    expect(post(openShop(), '/orders/order-9/pay', { cardToken: 'tok_visa' }).status).toBe(404)
  })
})

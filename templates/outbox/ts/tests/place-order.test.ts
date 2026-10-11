import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, get, grace, orderOf, post } from './shop-fixture.ts'

describe('placing an order', () => {
  it('saves a pending order and returns its id and total', () => {
    const shop = openShop()

    const response = post(shop, '/orders', {
      customer: ada,
      lines: [
        { sku: 'MUG-01', unitPriceCents: 1200, quantity: 2 },
        { sku: 'TEA-GREEN', unitPriceCents: 850, quantity: 1 },
      ],
    })

    expect(response).toEqual({ status: 201, body: { orderId: 'order-1', totalCents: 3250 } })
    expect(get(shop, '/orders/order-1').body).toEqual({
      orderId: 'order-1',
      status: 'pending',
      customerEmail: 'ada@example.com',
      totalCents: 3250,
    })
  })

  it('gives every order its own id', () => {
    const shop = openShop()

    expect(post(shop, '/orders', orderOf(ada, 1000)).body.orderId).toBe('order-1')
    expect(post(shop, '/orders', orderOf(grace, 2000)).body.orderId).toBe('order-2')
  })

  it('rejects an order without a valid customer email', () => {
    const response = post(openShop(), '/orders', orderOf({ name: 'Ada', email: 'ada' }, 1000))

    expect(response.status).toBe(400)
  })

  it('rejects an order without lines', () => {
    const response = post(openShop(), '/orders', { customer: ada, lines: [] })

    expect(response.status).toBe(400)
  })

  it('rejects a line with a quantity that is not a positive whole number', () => {
    const response = post(openShop(), '/orders', {
      customer: ada,
      lines: [{ sku: 'MUG-01', unitPriceCents: 1200, quantity: 0.5 }],
    })

    expect(response.status).toBe(400)
  })

  it('saves, publishes and sends nothing for a rejected order', () => {
    const shop = openShop()

    post(shop, '/orders', { customer: ada, lines: [] })

    expect(get(shop, '/orders/order-1').status).toBe(404)
    expect(shop.broker.published).toEqual([])
    expect(shop.mailer.sent).toEqual([])
  })

  it('finds nothing for an unknown order', () => {
    expect(get(openShop(), '/orders/order-9').status).toBe(404)
  })
})

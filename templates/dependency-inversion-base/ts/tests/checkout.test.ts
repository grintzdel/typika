import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, grace, orderOf } from './order-fixture.ts'

describe('checkout', () => {
  it('gives every order its own id', () => {
    const { checkout } = openShop()

    expect(checkout.placeOrder(orderOf(ada, 1000))).toBe('order-1')
    expect(checkout.placeOrder(orderOf(grace, 2000))).toBe('order-2')
  })

  it('finds a placed order by its id', () => {
    const { checkout } = openShop()
    const order = orderOf(grace, 5990)

    const orderId = checkout.placeOrder(order)

    expect(checkout.findOrder(orderId)).toEqual(order)
  })

  it('finds nothing for an unknown id', () => {
    expect(openShop().checkout.findOrder('order-9')).toBeUndefined()
  })
})

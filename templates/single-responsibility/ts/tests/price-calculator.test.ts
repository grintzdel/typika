import { describe, expect, it } from 'vitest'
import { PriceCalculator } from '../src/pricing/price-calculator.ts'
import { money } from '../src/shop/money.ts'
import { ada, grace, orderOf } from './order-fixture.ts'

describe('pricing an order', () => {
  it('prices a regular order with shipping and no discount', () => {
    const priced = new PriceCalculator().price(orderOf(ada, 3250))

    expect(priced).toMatchObject({ discount: money(0), shipping: money(490), total: money(3740) })
  })

  it('prices a member order with its discount and free shipping', () => {
    const priced = new PriceCalculator().price(orderOf(grace, 5990))

    expect(priced).toMatchObject({ discount: money(599), shipping: money(0), total: money(5391) })
  })
})

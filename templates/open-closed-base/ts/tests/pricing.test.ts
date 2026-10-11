import { describe, expect, it } from 'vitest'
import { totalOf } from '../src/pricing/price-order.ts'
import { money } from '../src/shop/money.ts'
import { ada, grace, orderOf } from './order-fixture.ts'

describe('order total', () => {
  it('charges a regular customer the full price', () => {
    expect(totalOf(orderOf(ada, 4000))).toEqual(money(4000))
  })

  it('takes 10% off for members', () => {
    expect(totalOf(orderOf(grace, 4000))).toEqual(money(3600))
  })

  it('takes 5.00 EUR off from 100.00 EUR', () => {
    expect(totalOf(orderOf(ada, 10000))).toEqual(money(9500))
  })

  it('applies the member and bulk discounts together', () => {
    expect(totalOf(orderOf(grace, 12000))).toEqual(money(12000 - 1200 - 500))
  })

  it('computes both discounts on the full price', () => {
    expect(totalOf(orderOf(grace, 10500))).toEqual(money(10500 - 1050 - 500))
  })
})

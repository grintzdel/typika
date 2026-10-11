import { describe, expect, it } from 'vitest'
import { totalOf } from '../src/pricing/price-order.ts'
import { receiptFor } from '../src/receipts/receipt.ts'
import { money } from '../src/shop/money.ts'
import { ada, grace, orderOf } from './order-fixture.ts'

const BLACK_FRIDAY = '2026-11-27'

describe('Black Friday', () => {
  it('takes 20% off orders placed on Black Friday', () => {
    expect(totalOf(orderOf(ada, 4000, BLACK_FRIDAY))).toEqual(money(3200))
  })

  it('adds up with the member discount', () => {
    expect(totalOf(orderOf(grace, 4000, BLACK_FRIDAY))).toEqual(money(4000 - 400 - 800))
  })

  it('adds up with the bulk discount, computed on the full price', () => {
    expect(totalOf(orderOf(ada, 11000, BLACK_FRIDAY))).toEqual(money(11000 - 500 - 2200))
  })

  it('gives nothing the day before or the day after', () => {
    expect(totalOf(orderOf(ada, 4000, '2026-11-26'))).toEqual(money(4000))
    expect(totalOf(orderOf(ada, 4000, '2026-11-28'))).toEqual(money(4000))
  })

  it('shows the Black Friday discount on the receipt, after the other discounts', () => {
    expect(receiptFor(orderOf(grace, 4000, BLACK_FRIDAY))).toBe(
      [
        '1 x TEST-SKU: 40.00 EUR',
        'Member discount (10%): -4.00 EUR',
        'Black Friday (20%): -8.00 EUR',
        'Total: 28.00 EUR',
      ].join('\n')
    )
  })
})

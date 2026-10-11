import { describe, expect, it } from 'vitest'
import { receiptFor } from '../src/receipts/receipt.ts'
import { money } from '../src/shop/money.ts'
import { ada, grace, orderOf } from './order-fixture.ts'

describe('receipt', () => {
  it('lists every line and the total', () => {
    const receipt = receiptFor({
      customer: ada,
      lines: [
        { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
        { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
      ],
      placedOn: '2026-11-20',
    })

    expect(receipt).toBe(['2 x MUG-01: 24.00 EUR', '1 x TEA-GREEN: 8.50 EUR', 'Total: 32.50 EUR'].join('\n'))
  })

  it('shows each discount it applies', () => {
    expect(receiptFor(orderOf(grace, 12000))).toBe(
      ['1 x TEST-SKU: 120.00 EUR', 'Member discount (10%): -12.00 EUR', 'Bulk discount: -5.00 EUR', 'Total: 103.00 EUR'].join(
        '\n'
      )
    )
  })
})

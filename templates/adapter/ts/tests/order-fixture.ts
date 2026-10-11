import { money } from '../src/shop/money.ts'
import type { Order } from '../src/shop/order.ts'

export const order: Order = {
  customer: { name: 'Ada', tier: 'regular' },
  lines: [
    { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
    { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
  ],
}

import { receiptFor } from './receipts/receipt.ts'
import { money } from './shop/money.ts'
import type { Order } from './shop/order.ts'

const orders: Order[] = [
  {
    customer: { name: 'Ada', email: 'ada@example.com', tier: 'regular' },
    lines: [
      { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
      { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
    ],
    placedOn: '2026-11-20',
  },
  {
    customer: { name: 'Grace', email: 'grace@example.com', tier: 'member' },
    lines: [
      { sku: 'KETTLE-01', unitPrice: money(5990), quantity: 1 },
      { sku: 'TEA-BLACK', unitPrice: money(950), quantity: 5 },
    ],
    placedOn: '2026-11-27',
  },
]

for (const order of orders) {
  console.log(`${order.customer.name}, ${order.placedOn}\n${receiptFor(order)}\n`)
}

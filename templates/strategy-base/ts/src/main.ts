import { quoteShipping } from './checkout/checkout.ts'
import { SHIPPING_OPTIONS } from './checkout/shipping-option.ts'
import { formatMoney, money } from './shop/money.ts'
import { subtotalOf, weightOf, type Order } from './shop/order.ts'

const orders: Order[] = [
  {
    customer: { name: 'Ada', tier: 'regular' },
    lines: [
      { sku: 'MUG-01', unitPrice: money(1200), quantity: 2, unitWeightGrams: 400 },
      { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1, unitWeightGrams: 250 },
    ],
  },
  {
    customer: { name: 'Grace', tier: 'member' },
    lines: [{ sku: 'KETTLE-01', unitPrice: money(5900), quantity: 1, unitWeightGrams: 2400 }],
  },
]

for (const order of orders) {
  const weightKg = (weightOf(order) / 1000).toFixed(1)
  console.log(
    `${order.customer.name} (${order.customer.tier}): ${weightKg} kg, subtotal ${formatMoney(subtotalOf(order))}`
  )
  for (const option of SHIPPING_OPTIONS) {
    const quote = quoteShipping(order, option)
    console.log(
      `  ${option.padEnd(12)} shipping ${formatMoney(quote.shipping).padStart(10)}   total ${formatMoney(quote.total).padStart(10)}`
    )
  }
}

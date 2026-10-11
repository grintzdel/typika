import { openShop } from './open-shop.ts'
import { money } from './shop/money.ts'

const shop = openShop()

shop.checkout.placeOrder({
  customer: { name: 'Ada', email: 'ada@example.com', tier: 'regular' },
  lines: [
    { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
    { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
  ],
})
shop.checkout.placeOrder({
  customer: { name: 'Grace', email: 'grace@example.com', tier: 'member' },
  lines: [{ sku: 'KETTLE-01', unitPrice: money(5990), quantity: 1 }],
})

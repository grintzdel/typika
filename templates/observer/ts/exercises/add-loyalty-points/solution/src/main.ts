import { openShop } from './open-shop.ts'
import { InMemoryOrderRepository } from './orders/order-repository.ts'
import { money } from './shop/money.ts'

const shop = openShop({
  orders: new InMemoryOrderRepository(),
  stock: {
    reserve: (lines) =>
      console.log(`  stock      reserved ${lines.map((line) => `${line.quantity} x ${line.sku}`).join(', ')}`),
  },
  notifier: { notify: (recipient, message) => console.log(`  email      to ${recipient}: ${message}`) },
  analytics: { track: (event, properties) => console.log(`  analytics  ${event} ${JSON.stringify(properties)}`) },
  loyalty: { award: (customerEmail, points) => console.log(`  loyalty    ${points} points for ${customerEmail}`) },
})

console.log('Ada places an order')
shop.placeOrder({
  customer: { name: 'Ada', email: 'ada@example.com', tier: 'regular' },
  lines: [
    { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
    { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
  ],
})

const endCampaign = shop.startLoyaltyCampaign()

console.log('Grace places an order during a loyalty campaign')
shop.placeOrder({
  customer: { name: 'Grace', email: 'grace@example.com', tier: 'member' },
  lines: [{ sku: 'KETTLE-01', unitPrice: money(5990), quantity: 1 }],
})

endCampaign()

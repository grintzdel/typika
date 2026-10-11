import { money } from '../src/shop/money.ts'
import type { Customer, Order } from '../src/shop/order.ts'

export const ada: Customer = { name: 'Ada', email: 'ada@example.com', tier: 'regular' }

export const grace: Customer = { name: 'Grace', email: 'grace@example.com', tier: 'member' }

export const orderOf = (customer: Customer, totalCents: number): Order => ({
  customer,
  lines: [{ sku: 'TEST-SKU', unitPrice: money(totalCents), quantity: 1 }],
})

import { money } from '../src/shop/money.ts'
import type { Customer, Order } from '../src/shop/order.ts'

export const ada: Customer = { name: 'Ada', email: 'ada@example.com', tier: 'regular' }

export const grace: Customer = { name: 'Grace', email: 'grace@example.com', tier: 'member' }

export const orderOf = (customer: Customer, subtotalCents: number, placedOn = '2026-11-20'): Order => ({
  customer,
  lines: [{ sku: 'TEST-SKU', unitPrice: money(subtotalCents), quantity: 1 }],
  placedOn,
})

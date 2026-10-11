import { money } from '../src/shop/money.js'

export const ada = { name: 'Ada', email: 'ada@example.com', tier: 'regular' }

export const grace = { name: 'Grace', email: 'grace@example.com', tier: 'member' }

export const orderOf = (customer, totalCents) => ({
  customer,
  lines: [{ sku: 'TEST-SKU', unitPrice: money(totalCents), quantity: 1 }],
})

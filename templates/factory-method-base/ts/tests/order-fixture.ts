import type { Order } from '../src/shop/order.ts'

export const orderOf = (weightGrams: number, name = 'Ada'): Order => ({
  customer: { name, tier: 'regular' },
  lines: [{ sku: 'TEST-SKU', quantity: 1, unitWeightGrams: weightGrams }],
})

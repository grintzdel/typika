import { money } from '../src/shop/money.ts'
import type { Customer, Order } from '../src/shop/order.ts'

type OrderFixture = {
  readonly tier?: Customer['tier']
  readonly subtotalCents: number
  readonly weightGrams: number
}

export const orderOf = ({ tier = 'regular', subtotalCents, weightGrams }: OrderFixture): Order => ({
  customer: { name: 'Test customer', tier },
  lines: [{ sku: 'TEST-SKU', unitPrice: money(subtotalCents), quantity: 1, unitWeightGrams: weightGrams }],
})

import { addMoney, multiplyMoney, ZERO, type Money } from './money.ts'

export type Sku = string

export type Customer = {
  readonly name: string
  readonly tier: 'regular' | 'member'
}

export type OrderLine = {
  readonly sku: Sku
  readonly unitPrice: Money
  readonly quantity: number
  readonly unitWeightGrams: number
}

export type Order = {
  readonly customer: Customer
  readonly lines: readonly OrderLine[]
}

export const subtotalOf = (order: Order): Money =>
  order.lines.reduce((sum, line) => addMoney(sum, multiplyMoney(line.unitPrice, line.quantity)), ZERO)

export const weightOf = (order: Order): number =>
  order.lines.reduce((sum, line) => sum + line.unitWeightGrams * line.quantity, 0)

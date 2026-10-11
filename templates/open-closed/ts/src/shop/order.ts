import { addMoney, multiplyMoney, ZERO, type Money } from './money.ts'

export type Sku = string

export type Customer = {
  readonly name: string
  readonly email: string
  readonly tier: 'regular' | 'member'
}

export type OrderLine = {
  readonly sku: Sku
  readonly unitPrice: Money
  readonly quantity: number
}

export type Order = {
  readonly customer: Customer
  readonly lines: readonly OrderLine[]
  readonly placedOn: string
}

export const lineAmount = (line: OrderLine): Money => multiplyMoney(line.unitPrice, line.quantity)

export const subtotalOf = (order: Order): Money => order.lines.reduce((sum, line) => addMoney(sum, lineAmount(line)), ZERO)

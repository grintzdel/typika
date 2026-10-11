export type Sku = string

export type Customer = {
  readonly name: string
  readonly tier: 'regular' | 'member'
}

export type OrderLine = {
  readonly sku: Sku
  readonly quantity: number
  readonly unitWeightGrams: number
}

export type Order = {
  readonly customer: Customer
  readonly lines: readonly OrderLine[]
}

export const weightOf = (order: Order): number =>
  order.lines.reduce((sum, line) => sum + line.unitWeightGrams * line.quantity, 0)

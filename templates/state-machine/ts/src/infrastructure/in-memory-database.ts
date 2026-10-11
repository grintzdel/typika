import type { OrderState } from '../orders/order-state.ts'

export type OrderLineRow = {
  sku: string
  unitPriceCents: number
  quantity: number
}

// #region tour:row
export type OrderRow = {
  id: string
  customerEmail: string
  customerName: string
  lines: OrderLineRow[]
  totalCents: number
  placedAt: Date
  chargeId: string | null
  state: OrderState
}
// #endregion

export class InMemoryDatabase {
  readonly orders = new Map<string, OrderRow>()
  private lastOrderId = 0

  nextOrderId(): string {
    this.lastOrderId += 1
    return `order-${this.lastOrderId}`
  }
}

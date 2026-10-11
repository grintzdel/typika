export type OrderLineRow = {
  sku: string
  unitPriceCents: number
  quantity: number
}

export type OrderRow = {
  id: string
  customerEmail: string
  customerName: string
  lines: OrderLineRow[]
  totalCents: number
  placedAt: Date
  chargeId: string | null
  deliveredAt: Date | null
  isPaid: boolean
  isShipped: boolean
  isDelivered: boolean
  isCancelled: boolean
}

export class InMemoryDatabase {
  readonly orders = new Map<string, OrderRow>()
  private lastOrderId = 0

  nextOrderId(): string {
    this.lastOrderId += 1
    return `order-${this.lastOrderId}`
  }
}

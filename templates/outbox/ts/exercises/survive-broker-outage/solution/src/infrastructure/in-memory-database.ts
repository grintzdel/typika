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

export type OutboxEntry = {
  readonly id: number
  readonly topic: string
  readonly payload: Readonly<Record<string, unknown>>
  published: boolean
}

export class InMemoryDatabase {
  readonly orders = new Map<string, OrderRow>()
  readonly outbox: OutboxEntry[] = []
  private lastOrderId = 0

  nextOrderId(): string {
    this.lastOrderId += 1
    return `order-${this.lastOrderId}`
  }

  addToOutbox(topic: string, payload: Readonly<Record<string, unknown>>): void {
    this.outbox.push({ id: this.outbox.length + 1, topic, payload, published: false })
  }

  // #region tour:transaction
  transaction<T>(work: () => T): T {
    const orders = [...this.orders].map(([id, row]): [string, OrderRow] => [id, { ...row, lines: [...row.lines] }])
    const outboxSize = this.outbox.length
    const lastOrderId = this.lastOrderId
    try {
      return work()
    } catch (error) {
      this.orders.clear()
      for (const [id, row] of orders) this.orders.set(id, row)
      this.outbox.length = outboxSize
      this.lastOrderId = lastOrderId
      throw error
    }
  }
  // #endregion
}

export type Customer = {
  readonly name: string
  readonly email: string
}

export type OrderLine = {
  readonly sku: string
  readonly unitPriceCents: number
  readonly quantity: number
}

// #region tour:events
export type OrderPlaced = {
  readonly type: 'OrderPlaced'
  readonly orderId: string
  readonly customer: Customer
  readonly lines: readonly OrderLine[]
  readonly totalCents: number
  readonly occurredAt: Date
}

export type OrderPaid = {
  readonly type: 'OrderPaid'
  readonly orderId: string
  readonly chargeId: string
  readonly totalCents: number
  readonly occurredAt: Date
}

export type OrderShipped = { readonly type: 'OrderShipped'; readonly orderId: string; readonly occurredAt: Date }

export type OrderDelivered = { readonly type: 'OrderDelivered'; readonly orderId: string; readonly occurredAt: Date }

export type OrderCancelled = {
  readonly type: 'OrderCancelled'
  readonly orderId: string
  readonly reason: string
  readonly occurredAt: Date
}

export type OrderEvent = OrderPlaced | OrderPaid | OrderShipped | OrderDelivered | OrderCancelled
// #endregion

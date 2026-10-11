export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export type OrderEvent =
  | {
      readonly type: 'OrderPlaced'
      readonly orderId: string
      readonly customerEmail: string
      readonly totalCents: number
      readonly occurredAt: Date
    }
  | {
      readonly type: 'OrderPaid'
      readonly orderId: string
      readonly totalCents: number
      readonly occurredAt: Date
    }
  | {
      readonly type: 'OrderShipped' | 'OrderDelivered' | 'OrderCancelled'
      readonly orderId: string
      readonly occurredAt: Date
    }

export const STATUS_AFTER: Readonly<Record<OrderEvent['type'], OrderStatus>> = {
  OrderPlaced: 'pending',
  OrderPaid: 'paid',
  OrderShipped: 'shipped',
  OrderDelivered: 'delivered',
  OrderCancelled: 'cancelled',
}

export interface Projection {
  apply(event: OrderEvent): void
}

import type { Money } from '../shop/money.ts'
import type { Order, OrderId, OrderRequest, OrderStatus, UnsavedOrder } from './domain/order.ts'

export type CustomerHistory = {
  readonly orderCount: number
  readonly totalSpent: Money
  readonly lastStatus: OrderStatus | null
}

export type ChargeResult =
  | { readonly status: 'approved'; readonly paymentId: string }
  | { readonly status: 'declined'; readonly reason: string }

export type OrderNotification =
  | { readonly kind: 'order-confirmed' | 'order-shipped'; readonly order: Order }
  | { readonly kind: 'order-cancelled'; readonly order: Order; readonly reason: string }

export type OrderEvent = {
  readonly type: 'OrderPlaced' | 'OrderPaid' | 'OrderShipped' | 'OrderCancelled'
  readonly order: Order
}

// #region tour:ports
export interface OrderUseCases {
  placeOrder(request: OrderRequest): Order
  payOrder(id: OrderId, cardToken: string): Order
  shipOrder(id: OrderId): Order
  deliverOrder(id: OrderId): Order
  cancelOrder(id: OrderId, reason: string): Order
  findOrder(id: OrderId): Order
  customerHistory(email: string): CustomerHistory
}

export interface OrderRepository {
  add(order: UnsavedOrder): Order
  update(order: Order): void
  find(id: OrderId): Order | undefined
  findByCustomer(email: string): readonly Order[]
}

export interface PaymentGateway {
  charge(amount: Money, cardToken: string): ChargeResult
  refund(paymentId: string): void
}

export interface Notifier {
  notify(notification: OrderNotification): void
}

export interface OrderEventPublisher {
  publish(event: OrderEvent): void
}

export interface Clock {
  now(): Date
}
// #endregion

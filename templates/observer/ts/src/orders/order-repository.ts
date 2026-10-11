import type { Order } from '../shop/order.ts'

export type OrderId = string

export interface OrderRepository {
  add(order: Order): OrderId
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<OrderId, Order>()

  add(order: Order): OrderId {
    const id = `order-${this.orders.size + 1}`
    this.orders.set(id, order)
    return id
  }
}

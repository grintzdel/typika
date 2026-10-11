import type { Order } from '../shop/order.ts'

export type OrderId = string

export class InMemoryOrderStore {
  private readonly orders = new Map<OrderId, Order>()

  add(order: Order): OrderId {
    const id = `order-${this.orders.size + 1}`
    this.orders.set(id, order)
    return id
  }

  find(id: OrderId): Order | undefined {
    return this.orders.get(id)
  }
}

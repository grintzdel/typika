import type { OrderId, OrderRepository } from '../checkout/order-repository.ts'
import type { Order } from '../shop/order.ts'

export class InMemoryOrderStore implements OrderRepository {
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

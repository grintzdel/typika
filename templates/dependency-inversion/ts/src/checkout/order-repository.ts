import type { Order } from '../shop/order.ts'

export type OrderId = string

export interface OrderRepository {
  add(order: Order): OrderId
  find(id: OrderId): Order | undefined
}

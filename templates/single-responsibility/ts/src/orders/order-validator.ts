import type { Order } from '../shop/order.ts'
import { InvalidOrderError } from './invalid-order-error.ts'

export class OrderValidator {
  validate(order: Order): void {
    if (order.lines.length === 0) throw new InvalidOrderError('An order needs at least one line')
    for (const line of order.lines) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new InvalidOrderError(`Invalid quantity for ${line.sku}: ${line.quantity}`)
      }
    }
    if (!order.customer.email.includes('@')) {
      throw new InvalidOrderError(`Invalid email address: ${order.customer.email}`)
    }
  }
}

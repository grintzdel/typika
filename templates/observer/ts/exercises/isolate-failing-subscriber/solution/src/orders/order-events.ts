import type { Money } from '../shop/money.ts'
import type { Order } from '../shop/order.ts'
import type { OrderId } from './order-repository.ts'

export type OrderPlaced = {
  readonly orderId: OrderId
  readonly order: Order
  readonly total: Money
}

export type OrderPlacedSubscriber = (event: OrderPlaced) => void

export type Unsubscribe = () => void

// #region tour:subject
export class OrderEvents {
  private readonly subscribers = new Set<OrderPlacedSubscriber>()
  private readonly onSubscriberError: (error: unknown) => void

  constructor(onSubscriberError: (error: unknown) => void) {
    this.onSubscriberError = onSubscriberError
  }

  subscribe(subscriber: OrderPlacedSubscriber): Unsubscribe {
    this.subscribers.add(subscriber)
    return () => {
      this.subscribers.delete(subscriber)
    }
  }

  publish(event: OrderPlaced): void {
    // #region tour:isolation
    for (const subscriber of [...this.subscribers]) {
      try {
        subscriber(event)
      } catch (error) {
        this.onSubscriberError(error)
      }
    }
    // #endregion
  }
}
// #endregion

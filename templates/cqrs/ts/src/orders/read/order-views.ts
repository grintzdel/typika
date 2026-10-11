import { STATUS_AFTER, type OrderEvent, type OrderStatus, type Projection } from '../order-events.ts'

export type OrderView = {
  readonly orderId: string
  readonly status: OrderStatus
  readonly customerEmail: string
  readonly totalCents: number
}

export class OrderViews implements Projection {
  private readonly views = new Map<string, OrderView>()

  apply(event: OrderEvent): void {
    if (event.type === 'OrderPlaced') {
      const { orderId, customerEmail, totalCents } = event
      this.views.set(orderId, { orderId, status: 'pending', customerEmail, totalCents })
      return
    }
    const view = this.views.get(event.orderId)
    if (view !== undefined) this.views.set(event.orderId, { ...view, status: STATUS_AFTER[event.type] })
  }

  find(orderId: string): OrderView | undefined {
    return this.views.get(orderId)
  }
}

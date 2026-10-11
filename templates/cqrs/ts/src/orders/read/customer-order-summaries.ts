import { STATUS_AFTER, type OrderEvent, type OrderStatus, type Projection } from '../order-events.ts'

// #region tour:read-model
export type CustomerOrderSummary = {
  readonly orderCount: number
  readonly totalSpentCents: number
  readonly lastStatus: OrderStatus | null
}

const NO_ORDERS: CustomerOrderSummary = { orderCount: 0, totalSpentCents: 0, lastStatus: null }
// #endregion

type PlacedOrder = { readonly customerEmail: string; readonly totalCents: number }

export class CustomerOrderSummaries implements Projection {
  private readonly summaries = new Map<string, CustomerOrderSummary & { readonly lastOrderId: string }>()
  private readonly orders = new Map<string, PlacedOrder>()

  // #region tour:projection
  apply(event: OrderEvent): void {
    if (event.type === 'OrderPlaced') {
      const { orderId, customerEmail, totalCents } = event
      const summary = this.forCustomer(customerEmail)
      this.orders.set(orderId, { customerEmail, totalCents })
      this.summaries.set(customerEmail, {
        orderCount: summary.orderCount + 1,
        totalSpentCents: summary.totalSpentCents + totalCents,
        lastStatus: 'pending',
        lastOrderId: orderId,
      })
      return
    }
    const order = this.orders.get(event.orderId)
    const summary = order && this.summaries.get(order.customerEmail)
    if (order === undefined || summary === undefined) return
    this.summaries.set(order.customerEmail, {
      ...summary,
      totalSpentCents: summary.totalSpentCents - (event.type === 'OrderCancelled' ? order.totalCents : 0),
      lastStatus: summary.lastOrderId === event.orderId ? STATUS_AFTER[event.type] : summary.lastStatus,
    })
  }
  // #endregion

  forCustomer(email: string): CustomerOrderSummary {
    const summary = this.summaries.get(email)
    if (summary === undefined) return NO_ORDERS
    const { orderCount, totalSpentCents, lastStatus } = summary
    return { orderCount, totalSpentCents, lastStatus }
  }
}

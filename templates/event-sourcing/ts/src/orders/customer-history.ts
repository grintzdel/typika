import type { OrderEvent } from './order-events.ts'
import type { OrderStatus } from './order.ts'

export type CustomerOrderSummary = {
  readonly orderCount: number
  readonly totalSpentCents: number
  readonly lastStatus: OrderStatus | null
}

const NO_ORDERS: CustomerOrderSummary = { orderCount: 0, totalSpentCents: 0, lastStatus: null }

const STATUS_AFTER: Readonly<Record<OrderEvent['type'], OrderStatus>> = {
  OrderPlaced: 'pending',
  OrderPaid: 'paid',
  OrderShipped: 'shipped',
  OrderDelivered: 'delivered',
  OrderCancelled: 'cancelled',
}

type PlacedOrder = { readonly customerEmail: string; readonly totalCents: number }

export class CustomerHistory {
  private readonly summaries = new Map<string, CustomerOrderSummary & { readonly lastOrderId: string }>()
  private readonly orders = new Map<string, PlacedOrder>()

  apply(event: OrderEvent): void {
    if (event.type === 'OrderPlaced') {
      const { orderId, customer, totalCents } = event
      const summary = this.forCustomer(customer.email)
      this.orders.set(orderId, { customerEmail: customer.email, totalCents })
      this.summaries.set(customer.email, {
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

  forCustomer(email: string): CustomerOrderSummary {
    const summary = this.summaries.get(email)
    if (summary === undefined) return NO_ORDERS
    const { orderCount, totalSpentCents, lastStatus } = summary
    return { orderCount, totalSpentCents, lastStatus }
  }
}

import type { OrderEvent, Projection } from '../order-events.ts'

export type DailyRevenue = {
  readonly day: string
  readonly salesCents: number
  readonly refundsCents: number
}

const dayOf = (date: Date) => date.toISOString().slice(0, 10)

export class RevenueByDay implements Projection {
  private readonly days = new Map<string, DailyRevenue>()
  private readonly paidOrders = new Map<string, number>()

  apply(event: OrderEvent): void {
    if (event.type === 'OrderPaid') {
      this.paidOrders.set(event.orderId, event.totalCents)
      this.add(dayOf(event.occurredAt), event.totalCents, 0)
    }
    if (event.type === 'OrderCancelled') {
      const paidCents = this.paidOrders.get(event.orderId)
      if (paidCents !== undefined) this.add(dayOf(event.occurredAt), 0, paidCents)
    }
  }

  all(): readonly DailyRevenue[] {
    return [...this.days.values()].sort((a, b) => a.day.localeCompare(b.day))
  }

  private add(day: string, salesCents: number, refundsCents: number): void {
    const current = this.days.get(day) ?? { day, salesCents: 0, refundsCents: 0 }
    this.days.set(day, {
      day,
      salesCents: current.salesCents + salesCents,
      refundsCents: current.refundsCents + refundsCents,
    })
  }
}

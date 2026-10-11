import { OrderEvents, type Unsubscribe } from './orders/order-events.ts'
import type { OrderId, OrderRepository } from './orders/order-repository.ts'
import { placeOrder } from './orders/place-order.ts'
import { awardLoyaltyPoints } from './orders/subscribers/award-loyalty-points.ts'
import { reserveStock } from './orders/subscribers/reserve-stock.ts'
import { sendConfirmation } from './orders/subscribers/send-confirmation.ts'
import { trackSale } from './orders/subscribers/track-sale.ts'
import type { Analytics } from './services/analytics.ts'
import type { LoyaltyProgram } from './services/loyalty-program.ts'
import type { Notifier } from './services/notifier.ts'
import type { Stock } from './services/stock.ts'
import type { Order } from './shop/order.ts'

export type ShopServices = {
  readonly orders: OrderRepository
  readonly stock: Stock
  readonly notifier: Notifier
  readonly analytics: Analytics
  readonly loyalty: LoyaltyProgram
}

export type Shop = {
  readonly placeOrder: (order: Order) => OrderId
  readonly startLoyaltyCampaign: () => Unsubscribe
}

const reportSubscriberError = (error: unknown) => console.error('An order subscriber failed:', error)

// #region tour:wiring
export const openShop = ({ orders, stock, notifier, analytics, loyalty }: ShopServices): Shop => {
  const events = new OrderEvents(reportSubscriberError)
  events.subscribe(reserveStock(stock))
  events.subscribe(sendConfirmation(notifier))
  events.subscribe(trackSale(analytics))

  return {
    placeOrder: (order) => placeOrder(order, orders, events),
    startLoyaltyCampaign: () => events.subscribe(awardLoyaltyPoints(loyalty)),
  }
}
// #endregion

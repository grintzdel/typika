import { OrderEvents } from './orders/order-events.js'
import { placeOrder } from './orders/place-order.js'
import { awardLoyaltyPoints } from './orders/subscribers/award-loyalty-points.js'
import { reserveStock } from './orders/subscribers/reserve-stock.js'
import { sendConfirmation } from './orders/subscribers/send-confirmation.js'
import { trackSale } from './orders/subscribers/track-sale.js'

const reportSubscriberError = (error) => console.error('An order subscriber failed:', error)

// #region tour:wiring
export const openShop = ({ orders, stock, notifier, analytics, loyalty }) => {
  const events = new OrderEvents(reportSubscriberError)
  events.subscribe(reserveStock(stock))
  events.subscribe(sendConfirmation(notifier))
  events.subscribe(trackSale(analytics))

  return {
    placeOrder: (order) => placeOrder(order, { orders, events }),
    startLoyaltyCampaign: () => {
      const campaign = new AbortController()
      events.subscribe(awardLoyaltyPoints(loyalty), { signal: campaign.signal })
      return () => campaign.abort()
    },
  }
}
// #endregion

import type { Order } from '../shop/order.ts'
import { ExpressShipping } from './options/express.ts'
import { StandardShipping } from './options/standard.ts'
import type { ShippingCost } from './shipping-cost.ts'
import type { ShippingOption } from './shipping-option.ts'
import { ShippingQuote, type Quote } from './shipping-quote.ts'

// #region tour:choice
const shippingCosts: Record<ShippingOption, ShippingCost> = {
  standard: new StandardShipping(),
  express: new ExpressShipping(),
}

export const quoteShipping = (order: Order, option: ShippingOption): Quote =>
  new ShippingQuote(shippingCosts[option]).for(order)
// #endregion

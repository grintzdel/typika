import type { Order } from '../shop/order.ts'
import type { ShippingOption } from './shipping-option.ts'
import { ShippingQuote, type Quote } from './shipping-quote.ts'

export const quoteShipping = (order: Order, option: ShippingOption): Quote => new ShippingQuote(option).for(order)

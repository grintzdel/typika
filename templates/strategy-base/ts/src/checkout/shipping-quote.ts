import { addMoney, isAtLeast, money, ZERO, type Money } from '../shop/money.ts'
import { subtotalOf, weightOf, type Order } from '../shop/order.ts'
import type { ShippingOption } from './shipping-option.ts'
import { FREE_SHIPPING_THRESHOLD, HEAVY_PARCEL_GRAMS } from './shipping-rules.ts'

export type Quote = {
  readonly subtotal: Money
  readonly shipping: Money
  readonly total: Money
}

export class ShippingQuote {
  private readonly option: ShippingOption

  constructor(option: ShippingOption) {
    this.option = option
  }

  for(order: Order): Quote {
    const subtotal = subtotalOf(order)
    const shipping = this.shippingCost(order, subtotal)
    return { subtotal, shipping, total: addMoney(subtotal, shipping) }
  }

  private shippingCost(order: Order, subtotal: Money): Money {
    const isMember = order.customer.tier === 'member'
    const freeShipping = this.option === 'standard' || isMember
    if (freeShipping && isAtLeast(subtotal, FREE_SHIPPING_THRESHOLD)) return ZERO

    const isHeavy = weightOf(order) > HEAVY_PARCEL_GRAMS
    if (this.option === 'express') {
      return isHeavy ? money(1890) : money(1290)
    } else {
      return isHeavy ? money(690) : money(490)
    }
  }
}

import { addMoney, money, multiplyMoney, percentOf, subtractMoney, ZERO, type Money } from '../shop/money.ts'
import type { Order, OrderLine } from '../shop/order.ts'

export type PricedLine = OrderLine & {
  readonly amount: Money
}

// #region tour:calculator
export type PricedOrder = {
  readonly lines: readonly PricedLine[]
  readonly discount: Money
  readonly shipping: Money
  readonly total: Money
}

const MEMBER_DISCOUNT_PERCENT = 10
const FREE_SHIPPING_FROM = money(5000)
const SHIPPING_FEE = money(490)

export class PriceCalculator {
  price(order: Order): PricedOrder {
    const lines = order.lines.map((line) => ({ ...line, amount: multiplyMoney(line.unitPrice, line.quantity) }))
    const subtotal = lines.reduce((sum, line) => addMoney(sum, line.amount), ZERO)
    const discount = order.customer.tier === 'member' ? percentOf(subtotal, MEMBER_DISCOUNT_PERCENT) : ZERO
    const discounted = subtractMoney(subtotal, discount)
    const shipping = discounted.cents >= FREE_SHIPPING_FROM.cents ? ZERO : SHIPPING_FEE

    return { lines, discount, shipping, total: addMoney(discounted, shipping) }
  }
}
// #endregion

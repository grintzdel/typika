import { subtractMoney, type Money } from '../shop/money.ts'
import { subtotalOf, type Order } from '../shop/order.ts'
import { discountsFor } from './discount-rules.ts'

export const totalOf = (order: Order): Money =>
  discountsFor(order).reduce((total, discount) => subtractMoney(total, discount.amount), subtotalOf(order))

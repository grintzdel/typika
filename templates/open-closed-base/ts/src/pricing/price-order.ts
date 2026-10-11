import { money, percentOf, subtractMoney, type Money } from '../shop/money.ts'
import { subtotalOf, type Order } from '../shop/order.ts'

export const MEMBER_DISCOUNT_PERCENT = 10
export const BULK_DISCOUNT_FROM = money(10000)
export const BULK_DISCOUNT = money(500)

export const totalOf = (order: Order): Money => {
  const subtotal = subtotalOf(order)
  let total = subtotal

  switch (order.customer.tier) {
    case 'member':
      total = subtractMoney(total, percentOf(subtotal, MEMBER_DISCOUNT_PERCENT))
      break
    case 'regular':
      break
  }

  if (subtotal.cents >= BULK_DISCOUNT_FROM.cents) {
    total = subtractMoney(total, BULK_DISCOUNT)
  }

  return total
}

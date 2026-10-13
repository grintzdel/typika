package pricing

import shop.Money
import shop.Order

fun totalOf(order: Order): Money = discountsFor(order).fold(order.subtotal) { total, discount -> total - discount.amount }

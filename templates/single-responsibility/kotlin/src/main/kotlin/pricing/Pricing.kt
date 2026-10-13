package pricing

import shop.Money
import shop.Order
import shop.Sku
import shop.Tier
import shop.eur

data class PricedLine(val sku: Sku, val quantity: Int, val amount: Money)

// #region tour:calculator
data class PricedOrder(val lines: List<PricedLine>, val discount: Money, val shipping: Money, val total: Money)

private const val MEMBER_DISCOUNT_PERCENT = 10
private val FREE_SHIPPING_FROM = eur(5000)
private val SHIPPING_FEE = eur(490)

fun priceOrder(order: Order): PricedOrder {
    val lines = order.lines.map { PricedLine(it.sku, it.quantity, it.unitPrice * it.quantity) }
    val subtotal = lines.fold(Money.ZERO) { sum, line -> sum + line.amount }
    val discount = if (order.customer.tier == Tier.MEMBER) subtotal.percent(MEMBER_DISCOUNT_PERCENT) else Money.ZERO
    val discounted = subtotal - discount
    val shipping = if (discounted.isAtLeast(FREE_SHIPPING_FROM)) Money.ZERO else SHIPPING_FEE

    return PricedOrder(lines, discount, shipping, total = discounted + shipping)
}
// #endregion

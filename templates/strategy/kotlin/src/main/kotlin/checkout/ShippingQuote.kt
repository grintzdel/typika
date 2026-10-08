package checkout

import shop.Order

// #region tour:context
class ShippingQuote(private val shippingCost: ShippingCost) {
    fun quote(order: Order): Quote {
        val subtotal = order.subtotal
        val shipping = shippingCost.costFor(order)
        return Quote(subtotal, shipping, subtotal + shipping)
    }
}
// #endregion

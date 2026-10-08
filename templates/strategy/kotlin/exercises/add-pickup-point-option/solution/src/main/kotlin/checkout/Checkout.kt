package checkout

import shop.Order

// #region tour:choice
private fun shippingCostOf(option: ShippingOption): ShippingCost = when (option) {
    ShippingOption.STANDARD -> StandardShipping
    ShippingOption.EXPRESS -> ExpressShipping
    ShippingOption.PICKUP_POINT -> PickupPointShipping
}

fun quoteShipping(order: Order, option: ShippingOption): Quote = ShippingQuote(shippingCostOf(option)).quote(order)
// #endregion

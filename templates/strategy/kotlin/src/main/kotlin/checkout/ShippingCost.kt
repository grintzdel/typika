package checkout

import shop.Money
import shop.Order

// #region tour:contract
fun interface ShippingCost {
    fun costFor(order: Order): Money
}
// #endregion

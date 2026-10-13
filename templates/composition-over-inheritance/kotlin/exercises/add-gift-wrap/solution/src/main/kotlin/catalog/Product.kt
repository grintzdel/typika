package catalog

import shop.Money

typealias Sku = String

// #region tour:compose
class Product(
    val sku: Sku,
    val name: String,
    private val basePrice: Money,
    private val pricing: Pricing,
    shipping: Shipping,
    packaging: Packaging,
    // #endregion
    // #region tour:delegate
) : Shipping by shipping, Packaging by packaging {
    fun price() = pricing.priceOf(basePrice) + packagingFee
}
// #endregion

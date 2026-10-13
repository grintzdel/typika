package catalog

import shop.Money

class DiscountedPerishableProduct(
    sku: Sku,
    name: String,
    basePrice: Money,
    private val discountPercent: Int,
) : PerishableProduct(sku, name, basePrice) {
    override fun price() = super.price().percentOff(discountPercent)
}

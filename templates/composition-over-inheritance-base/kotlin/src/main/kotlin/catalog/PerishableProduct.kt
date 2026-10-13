package catalog

import shop.Money

open class PerishableProduct(sku: Sku, name: String, basePrice: Money) : PhysicalProduct(sku, name, basePrice) {
    override val shippingMethod = ShippingMethod.REFRIGERATED

    override val packaging = listOf("insulated box")
}

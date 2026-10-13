package catalog

import shop.Money

open class PhysicalProduct(sku: Sku, name: String, basePrice: Money) : Product(sku, name, basePrice) {
    override val shippingMethod = ShippingMethod.PARCEL

    override val packaging = listOf("cardboard box")
}

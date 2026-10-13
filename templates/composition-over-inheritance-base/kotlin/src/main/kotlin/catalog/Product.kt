package catalog

import shop.Money

typealias Sku = String

enum class ShippingMethod { NONE, PARCEL, REFRIGERATED }

open class Product(val sku: Sku, val name: String, protected val basePrice: Money) {
    open fun price(): Money = basePrice

    open val shippingMethod = ShippingMethod.NONE

    open val packaging = emptyList<String>()
}

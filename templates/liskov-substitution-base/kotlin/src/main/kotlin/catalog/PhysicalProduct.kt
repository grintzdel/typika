package catalog

import shop.Money

typealias Sku = String

data class Parcel(val sku: Sku, val address: String, val weightInGrams: Int)

open class PhysicalProduct(val sku: Sku, val name: String, val price: Money, val weightInGrams: Int) {
    open fun ship(address: String) = Parcel(sku, address, weightInGrams)
}

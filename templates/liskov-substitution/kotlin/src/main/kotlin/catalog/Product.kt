package catalog

import shop.Money

typealias Sku = String

data class Parcel(val sku: Sku, val address: String, val weightInGrams: Int)

// #region tour:contract
interface Product {
    val sku: Sku
    val name: String
    val price: Money
}

interface Shippable {
    val weightInGrams: Int

    fun ship(address: String): Parcel
}

interface Downloadable {
    fun downloadLink(): String
}
// #endregion
